export function formatConvHistory(messages) {
    return messages.map((message, i) => {
        if (i % 2 === 0){
            return `Human: ${message}`
        } else {
            return `AI: ${message}`
        }
    }).join('\n')
}


//input

// const messages = [
//     "Hi there!",
//     "Hello! How can I help you?",
//     "What is the capital of France?",
//     "The capital of France is Paris.",
//   ];

//output 

// Human: Hi there!
// AI: Hello! How can I help you?
// Human: What is the capital of France?
// AI: The capital of France is Paris.
