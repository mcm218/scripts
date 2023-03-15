import config from "./config.json" assert { type: 'json' };
import dayOne from "./DayOneData/Journal.json" assert { type: 'json' };

// ! Rich text has the following
// * EmbeddedObjects => Array of photos, videos, or PDFs with a type and identifier
// * Text objects that should be combined?

const richTextToMarkdown = (richTextObj) => {
    const content = richTextObj.contents.reduce((previous, current) => {
        return previous ? previous + parseDayOneRichText(current) : parseDayOneRichText (current);
    }, "");

    return content;
}

const parseDayOneRichText = (obj) => {
    // TODO: Figure out how to handle media
    if (obj.embeddedObjects) {
        return "";
    }

    // TODO: No clue what day one is using this for
    if (obj.attributes) {
        return obj.text;
    }

    if (obj.text) {
        return obj.text;
    }

}

const dayOneJournalEntries = dayOne.entries;

console.log(dayOneJournalEntries.length);

const obsidianEntries = dayOneJournalEntries.map((dayOneEntry) => {
    let {
        text: text,
        richText: richText,
        ...metadata
    } = dayOneEntry;

    if (richText) {
        richText = JSON.parse(richText);
        richText = richTextToMarkdown(richText);
    }

    return {
        metadata: metadata,
        content: richText || text
    };
});

console.log(obsidianEntries[0]);
