"use strict;"
const express = require('express');
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const randomize = require('randomatic');
const cors = require('cors');
mongoose.set('strictQuery', true);

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors({
    methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT']
}));

/* Conexión con base de datos */
let mongoConnection = "mongodb://admin:nOen8e52JE4xwjN8@ac-cjjvtf4-shard-00-00.zfgrgjb.mongodb.net:27017,ac-cjjvtf4-shard-00-01.zfgrgjb.mongodb.net:27017,ac-cjjvtf4-shard-00-02.zfgrgjb.mongodb.net:27017/?ssl=true&replicaSet=atlas-qhc8nl-shard-0&authSource=admin&retryWrites=true&w=majority";
mongoose.connect(mongoConnection, { useNewUrlParser: true });

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'Error de conexión a la base de datos:'));
db.once('open', () => {
    console.log('Conexión exitosa a la base de datos');
});

/* USER */
let userSchema = mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    pass: {
        type: String,
        required: true
    },
    token: {
        type: String
    }
});

let User = mongoose.model('users', userSchema);

app.get("/api/users", (req, res) => {
    User.find({
        email: { $regex: req.query.email },
    }, function (err, docs) {
        res.status(200);
        res.send(docs);
    });

});

app.post('/api/users', (req, res) => {
    if (req.body.email == undefined) {
        res.status(400);
        res.send("No se agregó email");
        return;
    }
    if (req.body.pass == undefined) {
        res.status(400);
        res.send("No se agregó contraseña");
        return;
    }
    User.find({
        email: req.body.email
    }, function (err, docs) {
        if (docs.length != 0) {
            res.status(400);
            res.send('Email ya registrado');
            return;
        }
        let hash = bcrypt.hashSync(req.body.pass, 10);
        req.body.email = req.body.email.toLowerCase();
        let email = req.body.email;
        let newUser = { email: email, pass: hash };
        let user = User(newUser);

        user.save();
        res.status(200);
        res.send("Usuario agregado con exito");
    });
});

/* LOGIN */
app.post("/api/login", (req, res) => {
    if (!req.body.email) {
        res.status(400);
        res.send("No se agregó email");
        return;
    }
    if (!req.body.pass) {
        res.status(400);
        res.send("No se agregó contraseña");
        return;
    }
    User.find({
        email: req.body.email
    }, function (err, docs) {
        if (docs.length === 0) {
            res.status(401);
            res.send("Email incorrecto");
            return;
        }
        if (!bcrypt.compareSync(req.body.pass, docs[0].pass)) {
            res.status(401);
            res.send("Contraseña incorrecta");
            return;
        }
        let jObject = docs[0];
        if (jObject.token == undefined) {
            jObject.token = randomize('Aa0', '10') + "-" + jObject._id;
            let objectToUpdate = {
                _id: jObject._id,
                email: jObject.email,
                pass: jObject.pass,
                token: jObject.token
            }
            
            User.findByIdAndUpdate(jObject._id, objectToUpdate, { new: true }, (err, doc) => {
                if (err) {
                    res.send(err);
                }
                else {
                    res.status(200);
                    res.send(doc.token);
                    return
                }
            });
        }
        else {
            User.findById(jObject._id, (err, doc) => {
                if (err) {
                    res.send(err);
                }
                else {
                    res.status(200);
                    res.send(doc.token);
                    return;
                }
            });
        }
    });
});

/* PROFESSOR*/
let professorSchema = mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    apellido: {
        type: String,
        required: true
    },
    departamento: {
        type: String,
        required: true
    }

});

let Profesor = mongoose.model('professor', professorSchema);

app.get("/api/professors", (req, res) => {
    if (req.query.pid) {
        Profesor.find({
            _id: req.query.pid,
        }, function (err, docs) {
            res.status(200);
            res.send(docs);
            return;
        });
    }
    else {
        Profesor.find({
            nombre: { $regex: req.query.nombre },
        }, function (err, docs) {
            res.status(200);
            res.send(docs);
            return;
        });
    }
});

app.post('/api/professors', (req, res) => {
    if (req.body.nombre == undefined) {
        res.status(400);
        res.send("No se agregó nombre");
        return;
    }
    if (req.body.apellido == undefined) {
        res.status(400);
        res.send("No se agregó apellido");
        return;
    }
    if (req.body.departamento == undefined) {
        res.status(400);
        res.send("No se agregó departamento");
        return;
    }

    req.body.nombre = req.body.nombre.toUpperCase();
    req.body.apellido = req.body.apellido.toUpperCase();
    req.body.departamento = req.body.departamento.toUpperCase();
    let nombre = req.body.nombre;
    let apellido = req.body.apellido;
    let departamento = req.body.departamento;
    let newProfesor = { nombre: nombre, apellido: apellido, departamento: departamento };
    let profesor = Profesor(newProfesor);

    profesor.save();
    res.status(200);
    res.send("Profesor agregado con exito");
});

/* AUTH */
function authenticator(req, res, next) {
    let token = req.get("x-user-token");
    if (token) {
        User.find({
            token: token
        }, (err, doc) => {
            if (err) {
                res.send(err);
            }
            else {
                if (doc.length == 0) {
                    res.status(401);
                    res.send('Usuario no autenticado');
                    return;
                }
                else {
                    next();
                }
            }
        });
    }
    else {
        return res.status(401).send("Usuario no autenticado");
    }
}

/* COMMENT */
let commentSchema = mongoose.Schema({
    uid: {
        type: String,
        required: true
    },
    pid: {
        type: String,
        required: true
    },
    calificacion: {
        type: Number,
        min: 1,
        max: 10,
        required: true
    },
    dificultad: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    retomar: {
        type: Boolean,
        required: true
    },
    libros: {
        type: Boolean,
        required: true
    },
    asistencia: {
        type: Boolean,
        required: true
    },
    calificacionObtenida: {
        type: Number,
        min: 5,
        max: 10,
        required: true
    },
    comentario: {
        type: String,
    },
    fecha: {
        type: String
    },
    cursos: {
        type: String,
    },
    online: {
        type: Boolean,
    }
});

let Comment = mongoose.model('comments', commentSchema);

app.get("/api/comment", (req, res) => {
    Comment.find({
        pid: { $regex: req.query.pid }
    }, function (err, docs) {
        res.status(200);
        res.send(docs);
    });

});

app.use("/api/postComment", authenticator);

app.post('/api/postComment', (req, res) => {
    let token = req.get('x-user-token');
    if (req.body.calificacion == undefined) {
        res.status(400);
        res.send("Falta calificacion");
        return;
    }
    if (req.body.dificultad == undefined) {
        res.status(400);
        res.send("Falta dificultad");
        return;
    }
    if (req.body.retomar == undefined) {
        res.status(400);
        res.send("Falta retomar");
        return;
    }
    if (req.body.libros == undefined) {
        res.status(400);
        res.send("Falta libros");
        return;
    }
    if (req.body.asistencia == undefined) {
        res.status(400);
        res.send("Falta asistencia");
        return;
    }
    if (req.body.calificacionObtenida == undefined) {
        res.status(400);
        res.send("Falta calificacion obtenida");
        return;
    }
    User.find({
        token: token
    }, function (err, docs) {
        if (docs.length != 0) {
            let uid = docs[0]._id
            Comment.find({
                uid: uid,
                pid: req.body.pid
            }, (errCom, docCom) => {
                if (errCom) {
                    res.send(err);
                }
                else {
                    var event = new Date();
                    let newComment = {
                        uid: uid,
                        pid: req.body.pid,
                        calificacion: req.body.calificacion,
                        dificultad: req.body.dificultad,
                        retomar: req.body.retomar,
                        libros: req.body.libros,
                        asistencia: req.body.asistencia,
                        calificacionObtenida: req.body.calificacionObtenida,
                        comentario: req.body.comentario,
                        online: req.body.online,
                        cursos: req.body.cursos,
                        fecha: event.toLocaleDateString('es-ES')
                    };
                    let comment = Comment(newComment);
                    comment.save();
                    res.status(200);
                    res.send("Comentario agregado con exito");
                }
            });
        }
    });
});

app.listen(port, () => {
    console.log("Aplicacion corriendo en puerto " + port);
});
