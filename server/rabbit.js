const amqp = require('amqplib');
const { RABBIT } = require('../conf.json');
const fs = require('fs');


const connectRabbit = async () => {
    try {
        let connection = await amqp.connect(RABBIT.IP);
        return await connection.createChannel();

    } catch (error) {
        throw error;
    }
}

const consumeQue = (channel, defaultQue = RABBIT.QUE_SCAN) => {
    try {
        channel.assertQueue(defaultQue, {
            durable: false
        });

        channel.consume(defaultQue, function (msg) {
            if (msg !== null) {
                console.log('Recieved:', msg.content.toString());
                fs.appendFile('server/dataGSM.txt', msg.content.toString() + "\n", function (err) {
                    if (err) throw err;
                    console.log('Saved!');
                });
            } else {
                console.log('Consumer cancelled by server');
            }
        }, {
            noAck: true
        });
    } catch (error) {
        throw error;
    }

}

const publishQue = (channel, message, defaultQue = RABBIT.QUE_SCAN) => {
    try {
        channel.assertQueue(defaultQue, {
            durable: true
        });

        channel.sendToQueue(defaultQue, Buffer.from(message));
    } catch (error) {
        throw error;
    }

}

module.exports = {
    connectRabbit,
    publishQue,
    consumeQue
};