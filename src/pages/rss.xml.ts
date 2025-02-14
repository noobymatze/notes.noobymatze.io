import rss from '@astrojs/rss';
import {getCollection} from "astro:content";
import sanitizeHtml from 'sanitize-html';
import MarkdownIt from 'markdown-it';
const parser = new MarkdownIt('commonmark', {});

export async function GET(context: any) {
    const posts = await getCollection('posts');
    return rss({
        // `<title>` field in output xml
        title: "Matthias' notes",
        // `<description>` field in output xml
        description: 'Dreams from a noob',
        // Pull in your project "site" from the endpoint context
        // https://docs.astro.build/en/reference/api-reference/#contextsite
        site: context.site,
        // Array of `<item>`s in output xml
        // See "Generating items" section for examples using content collections and glob imports
        items: posts.filter(post => !post.data.draft).map((post) => ({
            title: post.data.title,
            pubDate: post.data.date,
            description: post.data.summary,
            content: sanitizeHtml(parser.render(post.body)),
            // Compute RSS link from post `slug`
            // This example assumes all posts are rendered as `/blog/[slug]` routes
            link: `/posts/${post.slug}/`,
        })),
        // (optional) inject custom xml
        customData: `<language>en-us</language>`,
    });
}