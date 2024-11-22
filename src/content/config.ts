import { z, defineCollection } from "astro:content";

const postCollection = defineCollection({
    type: 'content',
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
    type: 'content',
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

