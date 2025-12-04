import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

const MAX_SIZE_KB = 100;
const MAX_SIZE_BYTES = MAX_SIZE_KB * 1024;

/**
 * 画像を選択して100KB以下に圧縮
 * @returns 圧縮済み画像のURI、またはキャンセル時はnull
 */
export async function pickAndCompressImage(): Promise<string | null> {
  // カメラロールの権限を確認
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('カメラロールへのアクセス権限が必要です');
  }

  // 画像を選択
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1], // 正方形
    quality: 1, // 最高品質で取得（後で圧縮）
  });

  if (result.canceled) {
    return null;
  }

  const uri = result.assets[0].uri;

  // ファイルサイズをチェック
  const response = await fetch(uri);
  const blob = await response.blob();

  console.log(`元の画像サイズ: ${blob.size} bytes (${(blob.size / 1024).toFixed(1)} KB)`);

  if (blob.size <= MAX_SIZE_BYTES) {
    // 100KB以下ならそのまま返す
    console.log('圧縮不要');
    return uri;
  }

  // 100KBを超える場合は圧縮
  return await compressImage(uri, blob.size);
}

/**
 * 画像を100KB以下になるまで圧縮
 */
async function compressImage(uri: string, originalSize: number): Promise<string> {
  let quality = 0.8;
  let width = 800; // 最初のリサイズ幅
  let compressedUri = uri;
  let attempts = 0;
  const maxAttempts = 10;

  // 100KB以下になるまで繰り返し圧縮
  while (attempts < maxAttempts) {
    attempts++;

    const result = await ImageManipulator.manipulateAsync(
      compressedUri,
      [{ resize: { width } }],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    // サイズチェック
    const response = await fetch(result.uri);
    const blob = await response.blob();

    console.log(
      `圧縮試行 ${attempts}: width=${width}, quality=${quality.toFixed(2)}, size=${(
        blob.size / 1024
      ).toFixed(1)} KB`
    );

    if (blob.size <= MAX_SIZE_BYTES) {
      console.log(
        `圧縮成功: ${(originalSize / 1024).toFixed(1)} KB → ${(blob.size / 1024).toFixed(1)} KB`
      );
      return result.uri;
    }

    // まだ大きい場合はさらに圧縮
    compressedUri = result.uri;
    quality = Math.max(0.1, quality - 0.1);
    width = Math.floor(width * 0.85);
  }

  // 最大試行回数に達した場合は最後の結果を返す
  console.warn('最大試行回数に達しました。現在のサイズで続行します。');
  return compressedUri;
}
