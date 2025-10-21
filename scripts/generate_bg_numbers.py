from gtts import gTTS
import os, zipfile

os.makedirs("bg_numbers_audio", exist_ok=True)

bg_numbers = [
    "едно", "две", "три", "четири", "пет", "шест", "седем", "осем", "девет", "десет",
    "единадесет", "дванадесет", "тринадесет", "четиринадесет", "петнадесет", "шестнадесет",
    "седемнадесет", "осемнадесет", "деветнадесет", "двадесет",
]

bg_list = []
for i in range(1, 91):
    if i <= 20:
        bg_list.append(bg_numbers[i-1])
    else:
        tens = i // 10
        ones = i % 10
        tens_words = {
            2: "двадесет", 3: "тридесет", 4: "четиридесет", 5: "петдесет",
            6: "шейсет", 7: "седемдесет", 8: "осемдесет", 9: "деветдесет"
        }
        if ones == 0:
            bg_list.append(tens_words[tens])
        else:
            bg_list.append(f"{tens_words[tens]} и {bg_numbers[ones-1]}")

for i, word in enumerate(bg_list, 1):
    tts = gTTS(text=word, lang="bg")
    tts.save(f"bg_numbers_audio/{i}.mp3")

with zipfile.ZipFile("bulgarian_numbers_audio_1_to_90.zip", "w") as zipf:
    for file in os.listdir("bg_numbers_audio"):
        zipf.write(os.path.join("bg_numbers_audio", file), arcname=file)
