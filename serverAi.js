import express from "express";
const app = express();
import cors from "cors";
import morgn from "morgan";

import { Configuration, OpenAIApi } from "openai";

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.use(express.static("public"));
app.use(morgn("dev"));

import dotenv from "dotenv";

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

////////

const generateImage = async (prompt) => {
  const imgPrompt = `Generate a top view professional food plate image of a recipe that has ingredients from: ${prompt}`;
  const imgResult = await openai.createImage({
    prompt: imgPrompt,
    n: 1,
    size: "512x512",
    response_format: "b64_json",
  });

  const imgUrl = `data:image/png;base64,${imgResult.data.data[0].b64_json}`;
  // console.log(imgUrl);
  return imgUrl;
};

////////
app.post("/create-recipe", async (req, res) => {
  try {
    const prompt = req.body.prompt;
    const recipePrompt = `Generate a recipe that contains all the following recipe name and ingredients: ${prompt}`;

    const chat_completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a professional chef that can make real recipes that has a recipe name, prep time, ingredients and directions from ingredients. you can assume that the user has common spices like salt, black pepper, sugar, water, and such",
        },
        { role: "user", content: recipePrompt },
      ],
      temperature: 0.7,
      // max_tokens: 1,
      frequency_penalty: 0,
      presence_penalty: 0.3,
    });

    const response = chat_completion.data.choices[0].message;
    const content = response.content;
    console.log(content);

    ////////

    const recipeNameRegex = /Recipe Name:\s*(.+?)\n\n/m;
    const ingredientsRegex = /Ingredients:\s*([\s\S]+?)\n\n/m;

    const recipeNameMatch = content.match(recipeNameRegex);
    const ingredientsMatch = content.match(ingredientsRegex);

    const recipeName = recipeNameMatch ? recipeNameMatch[1] : "";
    const ingredients = ingredientsMatch ? ingredientsMatch[1] : "";

    const extractedData = `Recipe Name: ${recipeName}\n\nIngredients:\n${ingredients}`;
    console.log(extractedData);

    ///////
    const imgURL = await generateImage(extractedData);

    res.status(200).send({ imgURL, content });
  } catch (error) {
    res.status(500).send(error);
    console.log(error);
  }
});

////////////////////////////////////////

app.listen(process.env.PORT, () => {
  console.log(`Server is running on PORT ${process.env.PORT}`);
});
