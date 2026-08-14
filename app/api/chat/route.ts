// import { GoogleGenAI } from '@google/genai';

// const ai = new GoogleGenAI({
//   apiKey: process.env.GEMINI_API_KEY,
// });

// export async function POST(request: Request) {
//   try {
//     const { message } = await request.json();

//     if (!message) {
//       return Response.json(
//         {
//           success: false,
//           message: 'Message is required.',
//         },
//         { status: 400 },
//       );
//     }

//     const response = await ai.interactions.create({
//       model: 'gemini-3.6-flash',
//       input: message,
//       stream:true,
//     });

//     return Response.json({
//       success: true,
//       message: response.output_text,
//     });
//   } catch (error) {
//     console.error('AI Error:', error);

//     return Response.json(
//       {
//         success: false,
//         message:
//           error instanceof Error ? error.message : 'Something went wrong.',
//       },
//       { status: 500 },
//     );
//   }
// }

// import { GoogleGenAI } from '@google/genai';

// const ai = new GoogleGenAI({
//   apiKey: process.env.GEMINI_API_KEY,
// });

// export async function POST(request: Request) {
//   try {
//     const { message } = await request.json();

//     if (!message || typeof message !== 'string') {
//       return Response.json(
//         {
//           success: false,
//           message: 'Message is required.',
//         },
//         {
//           status: 400,
//         },
//       );
//     }

//     const stream = await ai.interactions.create({
//       model: 'gemini-3.6-flash',
//       input: message,
//       stream: true,
//     });

//     const encoder = new TextEncoder();

//     const readableStream = new ReadableStream({
//       async start(controller) {
//         try {
//           for await (const event of stream) {
//             if (
//               event.event_type === 'step.delta' &&
//               event.delta?.type === 'text'
//             ) {
//               controller.enqueue(encoder.encode(event.delta.text));
//             }
//           }

//           controller.close();
//         } catch (error) {
//           console.error('Streaming error:', error);

//           controller.error(error);
//         }
//       },
//     });

//     return new Response(readableStream, {
//       headers: {
//         'Content-Type': 'text/plain; charset=utf-8',
//         'Cache-Control': 'no-cache',
//       },
//     });
//   } catch (error) {
//     console.error('AI Error:', error);

//     return Response.json(
//       {
//         success: false,
//         message:
//           error instanceof Error ? error.message : 'Something went wrong.',
//       },
//       {
//         status: 500,
//       },
//     );
//   }
// }

import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { message, previousInteractionId } = await request.json();

    if (!message || typeof message !== 'string') {
      return Response.json(
        {
          success: false,
          message: 'Message is required.',
        },
        { status: 400 },
      );
    }

    const stream = await ai.interactions.create({
      model: 'gemini-3.6-flash',
      input: message,
      previous_interaction_id: previousInteractionId || undefined,
      stream: true,
    });

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            // Interaction ID
            if (event.event_type === 'interaction.created') {
              const interactionId = event.interaction.id;
               console.log('INTERACTION ID:', interactionId);
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'interaction_id',
                    id: interactionId,
                  })}\n\n`,
                ),
              );
            }

            // Text chunks
            if (
              event.event_type === 'step.delta' &&
              event.delta?.type === 'text'
            ) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'text',
                    text: event.delta.text,
                  })}\n\n`,
                ),
              );
            }
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'done',
              })}\n\n`,
            ),
          );

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);

          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('AI Error:', error);

    return Response.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Something went wrong.',
      },
      { status: 500 },
    );
  }
}