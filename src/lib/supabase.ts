import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function uploadFile(
  file: File,
  setProgress?: (progress: number) => void,
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const uniqueFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;

      if (setProgress) {
        setProgress(0);
        console.log("Upload starting...");
      }

      const { data, error } = await supabase.storage
        .from("meetings")
        .upload(uniqueFileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        throw error;
      }

      if (setProgress) {
        setProgress(100);
        console.log("Upload complete");
      }

      const { data: publicUrlData } = supabase.storage
        .from("meetings")
        .getPublicUrl(uniqueFileName);

      resolve(publicUrlData.publicUrl);
    } catch (error) {
      console.error("Supabase Upload Error:", error);
      reject(error);
    }
  });
}
