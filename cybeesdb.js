const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://cybees-public:cybees-public@cluster0.7mmzh.mongodb.net/cybees', {
    useUnifiedTopology: true
}).then(() => {
    console.log("Connection is set.")
}).catch((err) => {
    console.log("Connection Failed", err)
})