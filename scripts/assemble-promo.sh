#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/home/daniel-bo/Desktop/advantage-games-template"
OUT="$PROJECT_DIR/output/final"
mkdir -p "$OUT"

PR1="$PROJECT_DIR/output/pr1/promo.mp4"
PR3="$PROJECT_DIR/output/pr3/promo.mp4"
POSTER="$PROJECT_DIR/docs/week-1-results.webp"
JINGLE="$OUT/jingle.mp3"

W=1080
H=1920

echo "[1/6] Verifying inputs..."
for f in "$PR1" "$PR3" "$POSTER" "$JINGLE"; do
  if [ ! -f "$f" ]; then
    echo "Missing: $f" >&2; exit 1
  fi
done

echo "[2/6] Cropping PR1 gameplay (1440x900 -> 1440x844, scale -> 1080x1920 letterbox)..."
ffmpeg -y -ss 12 -i "$PR1" -t 8 -f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=48000" \
  -vf "crop=1440:844:0:28,scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black,setsar=1" \
  -shortest -r 50 -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p -c:a aac -b:a 128k \
  "$OUT/winner2-copter.mp4"

echo "[3/6] Cropping PR3 gameplay (1440x900 -> 1440x844, scale -> 1080x1920 letterbox)..."
ffmpeg -y -ss 3 -i "$PR3" -t 8 -f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=48000" \
  -vf "crop=1440:844:0:28,scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black,setsar=1" \
  -shortest -r 50 -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p -c:a aac -b:a 128k \
  "$OUT/winner1-cartoon.mp4"

echo "[4/6] Creating poster intro (4s)..."
ffmpeg -y -loop 1 -i "$POSTER" -t 4 -f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=48000" \
  -vf "scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black,setsar=1" \
  -shortest -r 50 -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p -c:a aac -b:a 128k \
  "$OUT/intro.mp4"

echo "[5/6] Creating poster finale (12s) with placeholder for Fah..."
ffmpeg -y -loop 1 -i "$POSTER" -t 12 -f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=48000" \
  -vf "scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black,setsar=1" \
  -shortest -r 50 -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p -c:a aac -b:a 128k \
  "$OUT/finale.mp4"

echo "[6/6] Concatenating all clips with jingle audio..."
JINGLE_DUR=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$JINGLE" | head -1)
echo "  jingle: ${JINGLE_DUR}s"

TOTAL=32
ffmpeg -y -i "$OUT/intro.mp4" -i "$OUT/winner1-cartoon.mp4" -i "$OUT/winner2-copter.mp4" -i "$OUT/finale.mp4" \
  -i "$JINGLE" \
  -filter_complex "
    [0:v][0:a][1:v][1:a][2:v][2:a][3:v][3:a]concat=n=4:v=1:a=1[v][a];
    [4:a]volume=0.55,afade=t=out:st=29:d=3[bgm];
    [a][bgm]amix=inputs=2:duration=first:dropout_transition=0[mix]
  " \
  -map "[v]" -map "[mix]" \
  -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p -r 50 \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  -t $TOTAL \
  "$OUT/week-1-results-promo.mp4"

ls -la "$OUT"
echo ""
echo "Output: $OUT/week-1-results-promo.mp4"
echo "Done."