const express = require('express');
var app = express();

const path = require('path');

var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static(path.join(__dirname, 'public')));

//firebase
var firebase = require("firebase");

const firebaseConfig = {
    apiKey: "AIzaSyCBPPkx5ask36z1lc_InZpKXYhbs4Lc27s",
    authDomain: "innlabvirtual-684a1.firebaseapp.com",
    databaseURL: "https://innlabvirtual-684a1.firebaseio.com",
    projectId: "innlabvirtual-684a1",
    storageBucket: "innlabvirtual-684a1.appspot.com",
    messagingSenderId: "314530013710",
    appId: "1:314530013710:web:6b52cb735ed666de"
};

firebase.initializeApp(firebaseConfig);

let db = firebase.database();
let auth = firebase.auth();

//firebase

//rutas
app.get('/', (req, res) => {
    res.send("Servidor InnReality");
});

//////////////////

const PORT = process.env.PORT || 80;

const server = app.listen(PORT, function () {
    console.log("¡Servidor InnReality Iniciado!")
});

var io = require('socket.io')(server);

io.on('connection', (socket) => {
    console.log('User connected');

    let user = null;
    let project = null;

    let postListener = null;
    let usersListener = null;

    socket.on('USER: login', (data) => {

        auth.signInWithEmailAndPassword(data.email, data.pass)
            .then((result) => {

                var uid = result.user.uid;

                var ref = db.ref("user/" + uid + "");
                ref.once("value")
                    .then((snapshot) => {

                        let pjs = [];

                        var refP = db.ref("user/" + uid + "/projects");
                        refP.once("value")
                            .then((dataSnapshot) => {

                                dataSnapshot.forEach(p => {
                                    pjs.push(p.val());
                                });

                                let u = {
                                    name: snapshot.child("name").val(),
                                    uid: snapshot.child("uid").val(),
                                    projects: pjs,
                                    pointer: snapshot.child("pointer").val(),
                                    pointer_pos: snapshot.child("pointer_pos").val()
                                }

                                socket.emit("LOGIN: success", u);
                                console.log("Login: " + u.name);
                                user = u;
                            });
                    });
            })
            .catch((error) => {
                // Handle Errors here.
                var errorCode = error.code;
                var errorMessage = error.message;
                if (errorCode === 'auth/wrong-password') {
                    console.log('Wrong password.');
                } else {
                    console.log(errorMessage);
                }
                console.log(error);
                socket.emit("LOGIN: failed", {});
            });
    });

    socket.on('USER: update position', (data) => {
        if (user && project) {

            let uid = user.uid;

            let ref = db.ref("projects/" + project.id + "/users/" + uid + "/pos");
            ref.set(data.pos)
                .then(() => {
                    return ref.once("value");
                })
                .then((snapshot) => {
                    var d = snapshot.val();
                }).catch((e) => {
                    console.log("Error con la posición, " + e);
                });
        }
    });

    socket.on('USER: update pointer', (data) => {
        if (user && project) {

            let uid = user.uid;

            let ref = db.ref("projects/" + project.id + "/users/" + uid + "/pointer_pos");
            ref.set(data.pointer_pos)
                .then(() => {
                    return ref.once("value");
                })
                .then((snapshot) => {
                    var d = snapshot.val();
                }).catch((e) => {
                    console.log("Error con la posición del puntero, " + e);
            });

            let ref2 = db.ref("projects/" + project.id + "/users/" + uid + "/pointer");
            ref2.set(data.pointer)
                .then(() => {
                    return ref.once("value");
                })
                .then((snapshot) => {
                    var d = snapshot.val();
                }).catch((e) => {
                    console.log("Error con el puntero, " + e);
            });
        }
    });

    socket.on('POST: update', (data) => {
        if (user && project) {

            let ref = db.ref("projects/" + project.id + "/posts/" + data.id);
            ref.set(data)
                .then(() => {
                    return ref.once("value");
                })
                .then((snapshot) => {
                    var d = snapshot.val();
                }).catch((e) => {
                    console.log("Error con la posición del post, " + e);
                });
        }
    });

    socket.on('PROJECT: select', (data) => {
        if (user) {

            let uid = user.uid;
            let projectID = data.msj;

            var ref = db.ref("projects/" + projectID + "");
            ref.once("value")
                .then((snapshot) => {

                    let pro = {
                        name: snapshot.child("name").val(),
                        id: snapshot.child("id").val()
                    }

                    project = pro;

                    socket.emit("PROJECT: selected", pro);
                    SetConnected(true, project.id, uid);

                    console.log(user.name + " selected the project: " + project.name);

                    usersListener = db.ref('projects/' + project.id + '/users');

                    project.users = [];

                    usersListener.on('child_added', (dataSnapshot) => {

                        if (!project) {
                            console.log("Try to listen the project user added, but there is no project");
                            return;
                        }

                        let data = null;

                        data = dataSnapshot.val();

                        socket.emit("PROJECT: user added", data);
                        project.users.push(data);
                    });

                    usersListener.on('child_changed', (dataSnapshot) => {

                        if (!project) {
                            console.log("Try to listen the project user changes, but there is no project");
                            return;
                        }

                        let data = null;

                        data = dataSnapshot.val();

                        socket.emit("PROJECT: user changes", data);
                        project.users.push(data.user);
                    });

                    postListener = db.ref('projects/' + project.id + '/posts');

                    project.posts = [];

                    postListener.on('child_added', (dataSnapshot) => {

                        if (!project) {
                            console.log("Try to listen the project post-it added, but there is no project");
                            return;
                        }

                        let data = null;

                        data = dataSnapshot.val();

                        socket.emit("PROJECT: posts added", data);
                        project.posts.push(data);
                    });

                    postListener.on('child_changed', (dataSnapshot) => {

                        if (!project) {
                            console.log("Try to listen the project post-it changes, but there is no project");
                            return;
                        }

                        let data = null;

                        data = dataSnapshot.val();

                        socket.emit("PROJECT: posts changes", data);
                        project.posts.push(data.user);
                    });

                }).catch((e) => {
                    console.log("Problem selecting project: " + e);
                });
        }
    });

    socket.on('PROJECT: clean', (data) => {
        if (user && project) {

            let uid = user.uid;
            let projectID = project.id;

            SetConnected(false, projectID, uid);

            var ref = db.ref("user/" + uid + "");
            ref.once("value")
                .then((snapshot) => {

                    let u = {
                        name: snapshot.child("name").val(),
                        uid: snapshot.child("uid").val(),
                        projects: snapshot.child("projects").val()
                    }

                    socket.emit("PROJECT: cleaned", u);

                    console.log(user.name + " ha salido del proyecto " + project.name);

                    user = u;
                    usersListener.off();
                    postListener.off();
                    usersListener = null;
                    postListener = null;
                    project = null;
                });
        }
    });

    socket.on('USER: sign out', (data) => {
        if (user) {

            let uid = user.uid;

            auth.signOut().then(() => {
                console.log("Sign out: " + user.name);

                if (project) {
                    let projectID = project.id;
                    SetConnected(false, projectID, uid);
                    usersListener.off();
                    postListener.off();
                    usersListener = null;
                    postListener = null;
                    project = null;
                }

                user = null;
            }).catch((error) => {
                console.log("Error de Desconección: " + error);
            });;
        }
    });

    socket.on('disconnect', (data) => {
        console.log('User disconnected');

        if (user) {

            let uid = user.uid;

            auth.signOut().then(() => {
                console.log("Sign out: " + user.name);

                if (project) {
                    let projectID = project.id;
                    SetConnected(false, projectID, uid);
                    usersListener.off();
                    postListener.off();
                    usersListener = null;
                    postListener = null;
                    project = null;
                }

                user = null;
            }).catch((error) => {
                console.log("Error de Desconección: " + error);
            });;
        }
    });

    socket.on('connect_error', () => {
        document.write("ERROR: Sorry, there seems to be an issue!");
    })

    socket.on('connect_failed', () => {
        document.write("ERROR: Sorry, there seems to be an issue with the connection!");
    })
});

function SetConnected(value, projectID, uid) {
    let r = db.ref("projects/" + projectID + "/users/" + uid + "/connected");
    r.set(value)
        .then(() => {
            return r.once("value");
        })
        .then((snapshot) => {
            var d = snapshot.val();
        }).catch((e) => {
            console.log(e);
        });
}