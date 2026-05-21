# Overview
Implemented automatic image resizing using Lambda + S3 trigger.

# Details
- Added S3 event notification
- Replaced sharp with Jimp due to Amplify Gen2 bundling issues
- Configured Lambda as arm64
- Increased timeout/memory for large images

# Verification
- Upload image to images/
- Confirm resized image generated under resized/

# Notes
sharp caused native module loading issues on Amplify Gen2 + Apple Silicon.

----
# Overview
画像アップロード時に自動でリサイズ画像を生成する Lambda 関数を Amplify Gen2 に実装

# Details
Amplify Storage(S3) の images/ upload を trigger に Lambda 起動
Lambda で Jimp を使用した画像リサイズ処理を実装
リサイズ後画像を resized/ 配下へ保存
S3 Event Notification を backend.ts に追加
Lambda に S3 read/write 権限を付与
Circular Dependency 回避のため resourceGroupName: 'storage' を追加
Lambda architecture を arm64 に設定
timeout / memory を増加し large image 処理に対応

