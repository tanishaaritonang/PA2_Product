import { supabase } from "../db/db.js";

const handlePopularPrompts = async (req, res) =>{
    try {
    const { data, error } = await supabase
      .from("user_prompts")
      .select("prompt, count")
      .order("count", { ascending: false })
      .limit(3);

    if (error) throw error;

    res.json(data); // Returns [{ prompt: "...", count: X }, ...]
  } catch (error) {
    console.error("Error fetching popular prompts:", error);
    res.status(500).json({ error: "Failed to fetch popular prompts" });
  }
}

export{handlePopularPrompts};