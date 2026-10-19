from groq import APIError, AsyncGroq

from app.core.config import settings
from app.core.exceptions import ServiceUnavailable


class RephraseService:
    async def rephrase(self, body: str) -> str:
        if not settings.groq_api_key:
            raise ServiceUnavailable("Leave-note rephrasing is not configured")

        try:
            async with AsyncGroq(api_key=settings.groq_api_key) as client:
                completion = await client.chat.completions.create(
                    model=settings.groq_model,
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "Rephrase the employee's leave note; do not copy it verbatim. "
                                "Correct spelling, grammar, capitalization, and punctuation, and make "
                                "the wording clear, concise, and professional. Preserve the original "
                                "meaning and every stated fact. Do not invent or infer dates, names, "
                                "medical details, reasons, or promises. Return only the rewritten note."
                            ),
                        },
                        {"role": "user", "content": body},
                    ],
                    temperature=0.35,
                )
        except APIError as exc:
            raise ServiceUnavailable("Leave-note rephrasing is temporarily unavailable") from exc

        rewritten = completion.choices[0].message.content
        if not rewritten or not rewritten.strip():
            raise ServiceUnavailable("Leave-note rephrasing returned no text")
        return rewritten.strip()