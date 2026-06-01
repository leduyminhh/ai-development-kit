---
name: youtube-transcript
description: Use when the user provides a YouTube URL or asks to download, fetch, transcribe, or clean up a YouTube transcript, captions, or subtitles.
---

# YouTube Transcript Downloader

Imported and adapted from `michalparkola/tapestry-skills` for this repository's skill layout.

This skill helps download transcripts (subtitles/captions) from YouTube videos using `yt-dlp`.

## When to Use This Skill

Activate this skill when the user:
- Provides a YouTube URL and wants the transcript
- Asks to download transcript, captions, or subtitles from YouTube
- Wants to transcribe a YouTube video
- Needs readable text content from a YouTube video

## How It Works

### Priority Order

1. Check if `yt-dlp` is installed and install it if needed.
2. List available subtitles to see what actually exists.
3. Try manual subtitles first with `--write-sub`.
4. Fallback to auto-generated subtitles with `--write-auto-sub`.
5. Use Whisper transcription only if no subtitles exist and the user confirms.
6. Confirm where the output file is saved.
7. Optionally convert VTT to deduplicated plain text.

## Installation Check

Always check if `yt-dlp` is installed first:

```bash
which yt-dlp || command -v yt-dlp
```

### If Not Installed

Attempt automatic installation based on the system:

**macOS (Homebrew)**:

```bash
brew install yt-dlp
```

**Linux (apt/Debian/Ubuntu)**:

```bash
sudo apt update && sudo apt install -y yt-dlp
```

**Alternative (pip - cross-platform)**:

```bash
pip3 install yt-dlp
# or
python3 -m pip install yt-dlp
```

If installation fails, tell the user they need to install `yt-dlp` manually and point them to
[yt-dlp installation](https://github.com/yt-dlp/yt-dlp#installation).

## Check Available Subtitles

Always do this before attempting to download:

```bash
yt-dlp --list-subs "YOUTUBE_URL"
```

Look for:
- Manual subtitles
- Auto-generated subtitles
- Available languages

## Download Strategy

### Option 1: Manual Subtitles

Preferred when available:

```bash
yt-dlp --write-sub --skip-download --output "OUTPUT_NAME" "YOUTUBE_URL"
```

### Option 2: Auto-Generated Subtitles

Fallback when manual subtitles are unavailable:

```bash
yt-dlp --write-auto-sub --skip-download --output "OUTPUT_NAME" "YOUTUBE_URL"
```

Both commands create a `.vtt` file.

## Option 3: Whisper Transcription

Use this only if manual and auto-generated subtitles are both unavailable.

### Step 1: Show File Size And Ask For Confirmation

```bash
yt-dlp --print "%(filesize,filesize_approx)s" -f "bestaudio" "YOUTUBE_URL"
yt-dlp --print "%(duration)s %(title)s" "YOUTUBE_URL"
```

Tell the user the rough download size and ask for confirmation before downloading audio.

### Step 2: Check Whisper Installation

```bash
command -v whisper
```

If Whisper is missing, ask before installing it:

```bash
pip3 install openai-whisper
```

### Step 3: Download Audio Only

```bash
yt-dlp -x --audio-format mp3 --output "audio_%(id)s.%(ext)s" "YOUTUBE_URL"
```

### Step 4: Transcribe With Whisper

```bash
whisper audio_VIDEO_ID.mp3 --model base --output_format vtt
```

If the language is known:

```bash
whisper audio_VIDEO_ID.mp3 --model base --language en --output_format vtt
```

Use `base` unless the user explicitly wants a different tradeoff.

### Step 5: Cleanup

After transcription, ask whether the audio file should be deleted to save space:

```bash
rm audio_VIDEO_ID.mp3
```

## Getting Video Information

### Extract Video Title

```bash
yt-dlp --print "%(title)s" "YOUTUBE_URL"
```

Sanitize the title for filenames by replacing characters such as `/`, `:`, `?`, and `"`.

## Post-Processing

### Convert To Plain Text

YouTube auto-generated VTT often contains duplicate lines due to progressive captions. Deduplicate while preserving speaking order:

```bash
python3 -c "
import re
seen = set()
with open('transcript.en.vtt', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('WEBVTT') and not line.startswith('Kind:') and not line.startswith('Language:') and '-->' not in line:
            clean = re.sub('<[^>]*>', '', line)
            clean = clean.replace('&amp;', '&').replace('&gt;', '>').replace('&lt;', '<')
            if clean and clean not in seen:
                print(clean)
                seen.add(clean)
" > transcript.txt
```

### End-To-End Plain Text Example

```bash
VIDEO_TITLE=$(yt-dlp --print "%(title)s" "YOUTUBE_URL" | tr '/' '_' | tr ':' '-' | tr '?' '' | tr '"' '')
VTT_FILE=$(ls *.vtt | head -n 1)

python3 -c "
import re
seen = set()
with open('$VTT_FILE', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('WEBVTT') and not line.startswith('Kind:') and not line.startswith('Language:') and '-->' not in line:
            clean = re.sub('<[^>]*>', '', line)
            clean = clean.replace('&amp;', '&').replace('&gt;', '>').replace('&lt;', '<')
            if clean and clean not in seen:
                print(clean)
                seen.add(clean)
" > "${VIDEO_TITLE}.txt"

echo "Saved to: ${VIDEO_TITLE}.txt"
rm "$VTT_FILE"
```

## Output Formats

- `.vtt`: keeps timestamps and caption structure
- `.txt`: plain text for reading or analysis

## Tips

- Output files usually look like `{output_name}.{language_code}.vtt`
- Many videos have auto-generated English subtitles
- Some videos provide multiple language choices
- If auto subtitles are unavailable, retry with manual subtitles first

## Error Handling

### Common Issues

1. `yt-dlp` not installed
   Install automatically when possible or provide manual instructions.
2. No subtitles available
   Try manual and auto-generated subtitles before offering Whisper.
3. Invalid, private, age-restricted, or geo-blocked video
   Show the specific `yt-dlp` error to the user.
4. Whisper installation fails
   Tell the user about missing dependencies or disk requirements.
5. Download interrupted
   Check connectivity and disk space, then retry.
6. Multiple subtitle languages
   Use `--list-subs` first and optionally `--sub-langs en` or a user-requested language.

### Best Practices

- Always run `--list-subs` first.
- Confirm large downloads and Whisper installation with the user.
- Keep the user updated about file locations and chosen fallback path.
- Clean up temporary files when the user wants plain-text output or disk-space cleanup.
