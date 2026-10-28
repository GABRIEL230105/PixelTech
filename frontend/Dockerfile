
# Imagem base do Node
FROM node:20-alpine
 
# Diretório de trabalho dentro do container
WORKDIR /app
 
# Copia primeiro os arquivos de dependências (aproveita cache do Docker)
COPY package*.json ./
 
# Instala as dependências
RUN npm install
 
# Copia o restante do código do projeto
COPY . .
 
# Porta padrão do Vite
EXPOSE 5173
 
# Comando para iniciar o servidor de desenvolvimento
# --host é necessário para o servidor ficar acessível de fora do container
CMD ["npm", "run", "dev", "--", "--host"]
 