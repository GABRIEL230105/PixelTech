// Banco de dados SIMULADO, em memória, para os testes de integração.
//
// Os modelos (User, Order, Otp) são os REAIS do projeto: a validação do schema, a conversão
// de ids (CastError), o e-mail em minúsculas e o hash da senha acontecem de verdade. O que é
// trocado são só as consultas ao MongoDB (findOne, create, updateOne...), que passam a ler e
// gravar em arrays. Nenhum teste toca no seu MongoDB.
//
// Só implementa o que o projeto usa. Se um controller passar a usar outra operação do
// Mongoose, este arquivo precisa aprender essa operação (o erro avisa qual).

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const Order = require("../../models/Order");
const Otp = require("../../models/Otp");

const ObjectId = mongoose.Types.ObjectId;
const store = {}; // { User: [...], Order: [...], Otp: [...] } (linhas simples, como no banco)
let down = false;

const assertUp = () => {
  if (down) throw new Error("banco fora do ar (simulado pelo teste)");
};

const sameValue = (a, b) => (a == null || b == null ? a == b : String(a) === String(b));

function matches(row, filter) {
  return Object.entries(filter).every(([key, cond]) => {
    const isOperator = cond !== null && typeof cond === "object" && !(cond instanceof ObjectId) && !(cond instanceof Date);
    if (isOperator) {
      if (Object.keys(cond).length === 1 && "$ne" in cond) return !sameValue(row[key], cond.$ne);
      throw new Error(`fakeDb: operador ainda não suportado: ${JSON.stringify(cond)}`);
    }
    return sameValue(row[key], cond);
  });
}

function sortRows(rows, spec) {
  if (!spec) return rows;
  const [field, dir] = Object.entries(spec)[0];
  return [...rows].sort((a, b) => (a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0) * (dir < 0 ? -1 : 1));
}

function applySelect(doc, spec) {
  if (!spec) return doc;
  const fields = String(spec).split(/\s+/).filter(Boolean);
  fields.filter((f) => f.startsWith("-")).forEach((f) => doc.set(f.slice(1), undefined));
  const include = fields.filter((f) => !f.startsWith("-"));
  if (include.length > 0) {
    Object.keys(doc.toObject()).forEach((k) => {
      if (k !== "_id" && !include.includes(k)) doc.set(k, undefined);
    });
  }
  return doc;
}

class FakeQuery {
  constructor(exec) {
    this._exec = exec;
    this._sort = null;
    this._select = null;
  }
  sort(spec) { this._sort = spec; return this; }
  select(spec) { this._select = spec; return this; }
  then(resolve, reject) { return Promise.resolve().then(() => this._exec(this)).then(resolve, reject); }
  catch(reject) { return this.then(undefined, reject); }
}

function install(Model) {
  const name = Model.modelName;
  const realFindOne = Model.findOne.bind(Model);
  const hasTimestamps = !!Model.schema.options.timestamps;
  store[name] = [];

  // Usa a conversão REAL do Mongoose (ex: id inválido vira CastError, e-mail vira minúsculo)
  const cast = (filter) => {
    const query = realFindOne(filter || {});
    query._castConditions();
    if (query.error()) throw query.error();
    return query.getFilter();
  };
  const findRows = (filter) => {
    const castFilter = cast(filter);
    return store[name].filter((row) => matches(row, castFilter));
  };

  const hydrate = (row) => {
    const doc = Model.hydrate({ ...row });
    // doc.save() grava de volta na linha correspondente
    doc.save = async () => {
      assertUp();
      const target = store[name].find((r) => sameValue(r._id, doc._id));
      if (target) {
        Object.assign(target, doc.toObject());
        if (hasTimestamps) target.updatedAt = new Date();
      }
      return doc;
    };
    return doc;
  };

  const applyUpdate = (row, update) => {
    Object.assign(row, update.$set || update);
    if (hasTimestamps) row.updatedAt = new Date();
  };

  Model.findOne = (filter) =>
    new FakeQuery((q) => {
      assertUp();
      const row = sortRows(findRows(filter), q._sort)[0];
      return row ? applySelect(hydrate(row), q._select) : null;
    });
  Model.findById = (id) => Model.findOne({ _id: id });
  Model.find = (filter) =>
    new FakeQuery((q) => {
      assertUp();
      return sortRows(findRows(filter), q._sort).map((row) => applySelect(hydrate(row), q._select));
    });

  Model.create = async (data) => {
    assertUp();
    const doc = new Model(data);
    await doc.validate(); // validação REAL do schema (ValidationError como no banco)

    if (name === "User") {
      // Replica o hook pre("save") do modelo: a senha nunca é guardada em texto puro
      doc.password = await bcrypt.hash(doc.password, 4);
      // Replica o índice único de e-mail do MongoDB
      if (store.User.some((u) => u.email === doc.email)) {
        const error = new Error("E11000 duplicate key error collection: users index: email_1");
        error.code = 11000;
        error.keyPattern = { email: 1 };
        error.keyValue = { email: doc.email };
        throw error;
      }
    }

    const row = doc.toObject();
    if (hasTimestamps) {
      row.createdAt = new Date();
      row.updatedAt = row.createdAt;
    }
    store[name].push(row);
    return hydrate(row);
  };

  Model.updateOne = async (filter, update) => {
    assertUp();
    const row = findRows(filter)[0];
    if (!row) return { matchedCount: 0, modifiedCount: 0 };
    applyUpdate(row, update);
    return { matchedCount: 1, modifiedCount: 1 };
  };

  // Roda tudo de uma vez, sem pausas no meio: é "atômico" como no MongoDB
  Model.findOneAndUpdate = async (filter, update, options = {}) => {
    assertUp();
    const row = findRows(filter)[0];
    if (!row) return null;
    const before = { ...row };
    applyUpdate(row, update);
    return hydrate(options.new ? row : before);
  };

  Model.deleteMany = async (filter) => {
    assertUp();
    const castFilter = cast(filter);
    const before = store[name].length;
    store[name] = store[name].filter((row) => !matches(row, castFilter));
    return { deletedCount: before - store[name].length };
  };

  Model.deleteOne = async (filter) => {
    assertUp();
    const row = findRows(filter)[0];
    if (row) store[name] = store[name].filter((r) => r !== row);
    return { deletedCount: row ? 1 : 0 };
  };
}

[User, Order, Otp].forEach(install);

module.exports = {
  store,
  // Chame no beforeEach: esvazia as "tabelas" e religa o banco
  reset() {
    Object.keys(store).forEach((name) => { store[name] = []; });
    down = false;
  },
  // Simula o banco fora do ar (toda consulta falha com um erro comum)
  setDown(value) { down = value; },
};