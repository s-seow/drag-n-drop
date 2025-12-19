const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const { mongoose } = require('./api/mongoose');

const bodyParser = require('body-parser');

// Load in mongoose models
const { Board, Column, TaskCard, User, ResetToken, Comment } = require('./api/models');
const e = require('express');

const env = process.env;

/* MIDDLEWARE */

// Load middleware
app.use(bodyParser.json());

// CORS HEADER MIDDLEWARE
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS, PUT, PATCH, DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-access-token, x-refresh-token, _id");
    res.header('Access-Control-Expose-Headers', 'x-access-token, x-refresh-token');
    next();
});



//check whether the request has a valid jwt access token
let authenticate = (req, res, next) => {
    let token = req.header('x-access-token');

    jwt.verify(token, User.getJWTSecret(), (err, decoded) => {
        if(err) {
            //jwt is invalid, DO NOT AUTHENTHICATE
            res.status(401).send(err);
        } else {
            req.user_id = decoded._id;
            next()
        }
    });
}

// Verify Refresh Token Middleware
let verifySession = (req, res, next) => {
    let refreshToken = req.header('x-refresh-token');
    let _id = req.header('_id');

    User.findByIdAndToken(_id, refreshToken).then((user) => {
        if (!user) {
            return Promise.reject({
                'error': 'User not found. Make sure than the refresh token and user id are correct'
            });
        }

        req.user_id = user._id;
        req.userObject = user;
        req.refreshToken = refreshToken;

        let isSessionValid = false;

        user.sessions.forEach((session) => {
            if (session.token === refreshToken) {
                if (User.hasRefreshTokenExpired(session.expiresAt) === false) {
                    isSessionValid = true;
                }
            }
        });

        if (isSessionValid) {
            next();
        } else { 
            return Promise.reject({
                'error': 'Refresh token has expired or the session is invalid'
            })
        }
    }).catch((e) => {
        res.status(401).send(e);
    });
}

/* END MIDDLEWARE */

app.get('/health', (_req, res) => res.status(200).send('OK'));

/* ROUTE HANDLERS */

/* KANBAN ROUTES */

/**
 * GET /boards
 * purpose: get all boards
 */
app.get('/boards', authenticate, (req, res) => {
    //return an array of all the boards in the database that belongs to the authenticated user.
    Board.find({
        'users._userId': req.user_id
    }).then((boards) => {
        res.send(boards);
    }).catch((e) => {
        res.send(e);
    })
})

/**
 * POST /boards
 * Purpose: create a board
 */
app.post('/boards', authenticate, (req, res) => {
    let title = req.body.title;

    let newBoard = new Board({
        title,
    });
    newBoard.save().then((boardDoc) => {
        // the full board doc is returned (including id)
        boardDoc.addUser(req.user_id).then((board) => {
            res.send(board);
        })
        
    });
});

/**
 * GET /boards/:id
 * purpose: get a board with specified id
 */
app.get('/boards/:id', authenticate, (req, res) => {
    //return a board in the database
    Board.findOne({
        _id: req.params.id
    }).then((board) => {
        res.send(board);
    }).catch((e) => {
        res.send(e);
    })
})

/**
 * PATCH /boards/:id
 * purpose: update a specified board
 */
app.patch('/boards/:id', authenticate, (req, res) => {
    //update the specified board (board document with id in the URL) with the new values specified in the JSON body of the request 
    Board.findOneAndUpdate({ 
        _id: req.params.id,
        'users._userId': req.user_id
    }, {
        $set: req.body
    }).then(() => {
        res.send({message: 'Updated Successfully.'});
    });
});

/**
 * DELETE /boards/:id
 * purpose: delete a board
 */
app.delete('/boards/:id', authenticate, (req,res) => {
    //delete the specified board (document with id in the URL)
    Board.findOneAndDelete({
        'users._userId': req.user_id,
        _id: req.params.id
    }).then((removedBoardDoc) => {
        res.send(removedBoardDoc);
    })
});

app.get('/boards/:id/users', authenticate, (req, res) => {
    //return a board in the database
    Board.findOne({
        _id: req.params.id
    }).then((board) => {
        res.send(board.users);
    }).catch((e) => {
        res.send(e);
    })
})


app.post ('/boards/:id/add-user', authenticate, (req, res) => {
    User.findOne({
        username: req.body.username
    }).then((addUser) => {
        Board.findOne({
            _id: req.params.id,
            'users._userId': req.user_id
        }).then((boardDoc) => {
            boardDoc.addUser(addUser._id).then(() => {
                res.send(true);
            })
        })
    }).catch((e) => {
        res.send(e);
    })
    
})

/**
 * GET /boards/:boardId/columns
 * Purpose: Get all columns in a specific board
 */
app.get('/boards/:boardId/columns', authenticate, (req, res) => {
    // We want to return all columns that belong to a specific board (specified by board ID)
    Column.find({
        _boardId: req.params.boardId
    }).then((columns) => {
        res.send(columns);
    }).catch((e) => {
        res.send(e);
    })
});

/**
 * GET /boards/:boardId/columns/:columnId
 */
app.get('/boards/:boardId/columns/:columnId', authenticate, (req, res) => {
    // get an existing column (specified by columnId)
    Column.findOne({
        _id: req.params.columnId,
        _boardId: req.params.boardId
    }).then((column) => {
        res.send(column);
    }).catch((e) => {
        res.send(e);
    })
});

/**
 * PATCH /boards/:boardId/columns/:columnId
 */
app.patch('/boards/:boardId/columns/:columnId', authenticate, (req, res) => {
    // Update an existing column (specified by columnId)
    Column.findOneAndUpdate({
        _id: req.params.columnId,
        _boardId: req.params.boardId
    }, {
        $set: req.body
    }).then(() => {
        res.send({message: 'Updated Successfully.'});
    })
});

/**
 * POST /boards/:boardId/columns
 * Purpose: Create a new column in a specific board
 */
app.post('/boards/:boardId/columns', authenticate, (req, res) => {
    //We want to create a new columns in a board specified by boardId
    Board.findOne({
        _id: req.params.boardId,
        'users._userId': req.user_id
    }).then((board) => {
        if (board) {
            return true;
        }
        return false;
    }).then((canCreateTask) => {
        if(canCreateTask) {
            let newColumn = new Column({
                title: req.body.title,
                _boardId: req.params.boardId,
                position: req.body.position,
            });
            newColumn.save().then((newColumnDoc) => {
                res.send(newColumnDoc);
            })
        } else {
            res.sendStatus(404);
        }
    })
})

/**
 * DELETE /boards/:boardId/columns/:columnId
 * Purpose: Delete a column
 */
app.delete('/boards/:boardId/columns/:columnId', authenticate, (req, res) => {
    Column.findOneAndDelete({
        _id: req.params.columnId,
        _boardId: req.params.boardId
    }).then ((removedColumnDoc) => {
        res.send(removedColumnDoc);
    })
});

/**
 * GET /columns/:columnId/taskcards
 * Purpose: Get all taskcards in a specific column
 */
app.get('/columns/:columnId/taskcards', authenticate, (req, res) => {
    // We want to return all taskcards that belong to a specific column (specified by column ID)
    TaskCard.find({
        _columnId: req.params.columnId
    }).then((taskcards) => {
        res.send(taskcards);
    })
});

/**
 * GET /columns/:columnId/taskcards/:taskcardId
 * Purpose: Get a taskcards with the specified columnId and id
 */
app.get('/columns/:columnId/taskcards/:taskcardId', authenticate, (req, res) => {
    // We want to return all taskcards that belong to a specific column (specified by column ID)
    TaskCard.findOne({
        _id: req.params.taskcardId,
        _columnId: req.params.columnId
        
    }).then((taskcard) => {
        res.send(taskcard);
    })
});

/**
 * PATCH /columns/:columnId/taskcard/:taskcardId
 */
app.patch('/columns/:columnId/taskcards/:taskcardId', authenticate, (req, res) => {
    // Update an existing taskcard (specified by taskcardId)
    TaskCard.findOneAndUpdate({
        _id: req.params.taskcardId,
        _columnId: req.params.columnId
    }, {
        $set: req.body
    }).then((taskcard) => {
        res.send(taskcard);
    })
});

/**
 * POST /columns/:columnId/taskcards
 * Purpose: Create a new taskcard in a specific column
 */
app.post('/columns/:columnId/taskcards', authenticate, (req, res) => {
    //We want to create a new taskcard in a column specified by columnId
    let newTaskCard = new TaskCard({
        title: req.body.title,
        description: req.body.description,
        _columnId: req.params.columnId,
        position: req.body.position,
        dueDate: req.body.dueDate
    });
    newTaskCard.save().then((newTaskCardDoc) => {
        res.send(newTaskCardDoc);
    })
})

/**
 * DELETE /columns/:columnId/taskcard/:taskcardId
 * Purpose: Delete a taskcard
 */
app.delete('/columns/:columnId/taskcards/:taskcardId', authenticate, (req, res) => {
    TaskCard.findOneAndDelete({
        _id: req.params.taskcardId,
        _columnId: req.params.columnId
    }).then ((removedTaskCardDoc) => {
        res.send(removedTaskCardDoc);
    })
});

app.get('/taskcards/:taskcardId/comments', authenticate, (req, res) => {
    //We want to get comments in a taskcard specified by taskcardId
    Comment.find({
        _taskcardId: req.params.taskcardId
    }).then((comments) => {
        res.send(comments);
    })
})

app.post('/taskcards/:taskcardId/comments', authenticate, (req, res) => {
    //We want to create a new comment in a taskcard specified by taskcardId
    let newComment = new Comment({
        _taskcardId: req.params.taskcardId,
        _userId: req.user_id,
        username: req.body.username, 
        message: req.body.message,
        date: req.body.date
    });
    newComment.save().then((newCommentDoc) => {
        res.send(newCommentDoc);
    })
})


/* USER ROUTES */

/**
 * POST /users
 * Purpose: Sign up
 */
app.post('/users', (req, res) => {
    let body = req.body;
    let newUser = new User(body);

    newUser.save().then(() => {
        return newUser.createSession();
    }).then((refreshToken) => {
        return newUser.generateAccessAuthToken().then((accessToken) => {
            return {accessToken, refreshToken}
        });
    }).then((authTokens) => {
        res
            .header('x-refresh-token', authTokens.refreshToken)
            .header('x-access-token', authTokens.accessToken)
            .send(newUser);
    }).catch((e) => {
        res.status(400).send(e);
    })
})

app.post('/users/username', (req, res) => {
    User.findOne({
        username: req.body.username
    }).then((user) => {
        if (user) {
            res.send(true);
        } else {
            res.send(false);
        }
    });
})

app.post('/users/email', (req, res) => {
    User.findOne({
        email: req.body.email
    }).then((user) => {
        if (user) {
            res.send(true);
        } else {
            res.send(false);
        }
    });
})

app.post(`/users/getuser`, (req, res) => {
    
    User.findOne({
        _id: req.body.userId
    }).then((user) => {
        if (user) {
            res.send(user.toJSON());
        } else {
            res.send('');
        }
    })
})

/**
 * POST /users/login
 * Purpose: Login
 */
app.post('/users/login', (req, res) => {
    let username = req.body.username;
    let password = req.body.password;

    User.findByCredentials(username, password). then ((user) => {
        return user.createSession().then((refreshToken) => {
            return user.generateAccessAuthToken().then ((accessToken) => {
                return {accessToken, refreshToken}
            });
        }).then((authTokens) => {
            res
            .header('x-refresh-token', authTokens.refreshToken)
            .header('x-access-token', authTokens.accessToken)
            .send(user);
        })
    }).catch((e) => {
        res.status(400).send(e);
    })
})

/**
 * GET /users/me/access-token
 * Purpose: generates and returns an access token
 */
app.get(`/users/me/access-token`, verifySession, (req, res) => {
    req.userObject.generateAccessAuthToken().then((accessToken) => {
        res.header('x-access-token', accessToken).send({ accessToken });
    }).catch((e) => {
        res.status(400).send(e);
    });

})

/* RESET ROUTES */

app.post('/send-email', (req, res) => {
    const email = req.body.email
    User.findOne({
        email: {$regex: '^'+email+'$', $options: 'i'}
    }).then((user) => {
        if (!user) {
            res.sendStatus(404)
        }
        const payload = {
            email: user.email
        }
        const expiryTime = 300;
        const token = jwt.sign(payload, User.getJWTSecret(), {expiresIn: expiryTime});

        const newToken = new ResetToken({
            userId: user._id,
            token: token
        });
        
        const mailTransporter = nodemailer.createTransport({
            service: env.SMTP_SERVICE,
            auth: {
                user: env.SMTP_USER,
                pass: env.SMTP_PASS
            }
        })
        let mailDetails = {
            from: env.SMTP_FROM,
            to: email,
            subject: "Reset Password",
            html: `
                    <html>
                    <head>
                        <title>Password Reset Request</title>
                    </head>
                    <body>
                        <h1>Password Reset Request</h1>
                        <p>Dear ${user.username},</p>
                        <p>We have received a request to reset your password for your account with DragNDrop. To complete the password reset process, please click on the button below!</p>
                        <a href="http://localhost:4200/reset-password/${token}"><button style="background-color: #d291bc; color: white; padding: 14px 20px; border: none;
                        cursor: pointer; border-radius: 4px;">Reset Password</button></a>
                        <p>Please note that this link is only valid for 5 mins. If you did not request a password reset, please disregard this message.</p>
                        <p>Thank you</p>
                    </body>
                    </html>
                `,
        };
        mailTransporter.sendMail(mailDetails, async(err, data) => {
            if (err) {
                console.log(err);
                res.send(false);
            } else {
                await newToken.save();
                res.send(true)
            }
        })
        
    })
})

app.post('/reset-password', (req, res) => {
    const token = req.body.token;
    const newPassword = req.body.password;
    jwt.verify(token, User.getJWTSecret(), async(err, data) => {
        if (err) {
            res.send(false)
        } else {
            const response = data;
            const user = await User.findOne({email: { $regex: '^' + response.email + '$', $options: 'i'}})
            user.password = newPassword
            await user.save()
            res.send(true)
        }
    })
})

/* HELPER METHODS */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

// app.listen(3000, () => {
//     console.log("Server is listening on port 3000");
// })
