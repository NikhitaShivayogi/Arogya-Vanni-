# AI Models Used in Arogya Vanni

Arogya Vanni uses three OpenAI models. Each model has a specific job:

| Model | What it does | Why the project uses it |
| --- | --- | --- |
| `gpt-5-mini` | Answers health questions, analyzes prescriptions, medicine packages and medical reports, and responds to follow-up questions. It also writes explanations in the user's selected language. | The app needs one model that can understand questions and uploaded documents and produce clear explanations. |
| `whisper-1` | Turns a user's voice recording into text. It transcribes in the spoken language and does not translate the recording. | This lets users ask questions by voice and review the transcript before sending it. |
| `gpt-4o-mini-tts` | Turns a written answer into spoken audio in the selected language and voice. | This lets users listen to answers instead of only reading them. |

**Language note:** The project does not use a separate translation model. For text answers and document explanations, `gpt-5-mini` is instructed to use the selected language. Speech transcription and spoken answers use their respective audio models.

These model names are configured in the backend. Requests go to OpenAI using the backend API key; keep that key private and out of frontend code.
