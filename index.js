const express = require('express')
const { ApolloServer } = require("apollo-server-express")
const dotenv = require('dotenv')

dotenv.config()


const typeDefs = require("./typeDefs")
const resolvers = require("./resolvers")

async function startServer() {
    const app = express()
    const apolloServer = new ApolloServer({
        graphiql:true,
        typeDefs,
        resolvers,
        csrfPrevention: true,
        cache: "bounded",
        formatError: (err) => {
        return err;
        },
        introspection:true
    })

    await apolloServer.start()

    apolloServer.applyMiddleware({ app: app })

    app.use((req, res) => {
        res.send("hello from server")
    })


    const sequelize = require("./db/connection")

    const port = process.env.PORT || 5000

    app.listen(port, () => {
        console.log("server is runnig at " + port)
    })
}
startServer()
