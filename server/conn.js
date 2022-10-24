const { connectRabbit, publishQue, consumeQue } = require('./rabbit');

const main = async () => {
    try {
        let channel = await connectRabbit();
        consumeQue(channel)
    } catch (error) {
        
    } 
}

main().then(console.log("Starting..."))