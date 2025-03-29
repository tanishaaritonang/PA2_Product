import {RecursiveCharacterTextSplitter} from "langchain/text_splitter"
import {createClient} from "@supabase/supabase-js"
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings,ChatOpenAI } from "@langchain/openai";
import { promises as fs } from 'fs';


import dotenv from "dotenv";
dotenv.config()
try {
    const text = await fs.readFile("datasets.text","utf-8")


    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize:500,
        separators:['\n\n','\n',' ',''],
        chunkOverlap:50
    })

    const output = await splitter.createDocuments([text])


    const supabaseKey= process.env.SUPABASE_KEY
    const supabaseUrl=  process.env.SUPABASE_URL
    const openAIApiKey = process.env.OPENAI_API_KEY
    const embeddings = new OpenAIEmbeddings({openAIApiKey});
      
      const client = createClient(
      supabaseUrl,  supabaseKey
      );
      
     await SupabaseVectorStore.fromDocuments(output,embeddings,{client,tableName:'documents'});


} catch (error) {
    console.log(error)

}
