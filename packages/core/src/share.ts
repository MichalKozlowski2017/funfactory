/**
 * Udostępnianie obrazka (systemowy arkusz „Udostępnij”: zapis do zdjęć, wiadomość, mail).
 * Osobny moduł (`@funfactory/core/share`), żeby gry bez udostępniania nie potrzebowały wtyczek.
 * W przeglądarce: pobranie pliku.
 */
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { isNative } from './platform.ts';

/** `dataUrl`: obraz „data:image/png;base64,…” albo jpeg; `name`: nazwa pliku z rozszerzeniem. */
export async function shareImage(dataUrl: string, name: string, title = ''): Promise<boolean> {
  try {
    if (isNative()) {
      const data = dataUrl.slice(dataUrl.indexOf(',') + 1);
      const file = await Filesystem.writeFile({ path: name, data, directory: Directory.Cache });
      await Share.share({ title, files: [file.uri] });
      return true;
    }
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = name;
    a.click();
    return true;
  } catch {
    // Anulowane przez użytkownika albo brak wtyczki.
    return false;
  }
}
