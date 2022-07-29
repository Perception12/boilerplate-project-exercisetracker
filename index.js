const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
require('dotenv').config()

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000 
})

const connection = mongoose.connection
connection.on('error', console.error.bind(console, 'connection error:'))
connection.once('open', () => {
  console.log("MongoDb Database connection established successfully")
})

app.use(bodyParser.urlencoded({
  extended: false
}))
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const userSchema = new mongoose.Schema ({
  username: {type: String, required: true},
  log: [{
    description: {type: String, required: true},
    duration: {type: Number, required: true},
    date: Date
  }]
})

const USER = mongoose.model('USER', userSchema)

app.post('/api/users', (req, res) => {
  const username = req.body.username
  let user = new USER({
    username: username
  })

  user.save((err, data) => {
    if (err) return console.log(err);
    res.json({
      username: username,
      _id: data._id
    })
  })
})

app.get('/api/users', (req, res) => {
  USER.find({}, (err, users) => {
    var userList = [];
    users.forEach((user) => {
      userList.push({_id: user._id, username: user.username})
    })

    res.send(userList);
  })
})

app.post('/api/users/:_id/exercises', (req, res, next) => {
  var userId = req.params._id;
  var description = req.body.description;
  var duration = req.body.duration;
  var date = req.body.date ;
  
  if (!date) {
    date = new Date().toDateString();
  } else {
    date = new Date(date).toDateString();
  }

  const exerciseObject = {
    description,
    duration,
    date
  }

  USER.findById({_id: userId}, (err, user) => {
    if (err) return console.log("find error: ", err);
    user.markModified('edited-field');
    user.log.push(exerciseObject);

    user.save((err, updatedUser) => {
      if (err) return console.log("Update error: ", err);
      res.json({
        username: updatedUser.username,
        description: description,
        duration: parseInt(duration),
        date: date,
        _id: userId
      })
    })
  })
})

app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.params._id;
  const from = req.query.from;
  const to = req.query.to;
  const limit = req.query.limit;

  USER.findById({_id: userId}, (err, user) => {
    if(err) return console.log("log find error: ", err);
    let log = user.log.map(item => {
      return {
        description: item.description,
        duration: item.duration,
        date: item.date
      }
    })

    if (from) {
      const fromDate = new Date(from);
      log = log.filter(exe => {
        new Date(exe.date) >= fromDate;
      })
    }

    if (to) {
      const toDate = new Date(to);
      log = log.filter(exe => {
        new Date(exe.date) <= toDate;
      })
    }

    if (limit) {
      log = log.slice(0, limit)
    }

    let count = log.length;

    res.send({
      username: user.username,
      count: count,
      _id: userId,
      log: log
    })
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

