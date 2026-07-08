import { z, defineCollection } from "astro:content";
import { glob } from "astro/loaders";

const postCollection = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
    schema: z.object({
        title: z.string(),
        summary: z.string(),
        draft: z.boolean().default(false),
        date: z.date(),
        author: z.string(),
        tags: z.array(z.string()),
    })
});

const dreamCollection = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/dreams" }),
    schema: z.object({
        title: z.string(),
        summary: z.string(),
        draft: z.boolean().default(false),
        date: z.date(),
        author: z.string(),
        tags: z.array(z.string()),
    })
});

export const collections = {
    posts: postCollection,
    dreams: dreamCollection,
};
