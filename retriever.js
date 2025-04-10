import { createClient} from "@supabase/supabase-js"
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";


    const supabaseKey= process.env.SUPABASE_KEY
    const supabaseUrl=  process.env.SUPABASE_URL
    const openAIApiKey = process.env.OPENAI_API_KEY
    
    const embeddings = new OpenAIEmbeddings({openAIApiKey});
      
      const client = createClient(
      supabaseUrl,  supabaseKey
      );

     const vectorStore = new SupabaseVectorStore(embeddings,{
        client,
        tableName:'documents',
        queryName:"match_documents"});

     const retriever = vectorStore.asRetriever()

     export {retriever}