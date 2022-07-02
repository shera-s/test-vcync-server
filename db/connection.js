const Sequelize = require("sequelize-cockroachdb")
const dotenv = require('dotenv')

dotenv.config()

const connectionString = process.env.DATABASE_URL

const sequelize = new Sequelize(connectionString, {
    host: 'localhost',
    dialect: 'postgres'
  })
try {
    sequelize.authenticate();
    console.log('Database connected');
} catch (error) {
    console.error('Unable to connect to the database:', error);
}

module.exports = sequelize