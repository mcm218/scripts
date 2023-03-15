import { NotionAxios } from "./Services/axios-service.js";

// TODO: Need to handle rate limiting

const PAGE_SIZE = 100;

export default async () => {
  const response = await NotionAxios.post(
    `/databases/${"8b05e777cf524ab5bdffff6bf969ec40"}/query`,
    {
      filter: {
        and: [
          {
            property: "Type",
            select: {
              equals: "Daily",
            },
          },
          {
            property: "Title",
            title: {
              does_not_equal: "Daily Note",
            },
          },
        ],
      },
      sorts: [
        {
          property: "Created",
          direction: "descending",
        },
      ],
    }
  );

  if (response.data) {
    console.log(`Found ${response.data.results.length} pages in Notion`);
    // TODO: Remove once script is fully finished
    response.data.results = [response.data.results[0]];

    const notionPages = (
      await Promise.all(
        response.data.results.map((result) => getNotionPage(result.id))
      )
    ).map((response) => response.data);

    console.log(`Parsing notion pages...`);
    const markdownPages = await Promise.all(
      notionPages.map(async (page) => await notionPageToMarkdown(page))
    );
    console.log(markdownPages[0]);
    console.log(markdownPages.length);
  }
};

const notionPageToMarkdown = async (notionPage) => {
  // TODO: Parse and set metadata

  // TODO: Parse and set content
  const fullNotionPage = await getNotionPageContent(notionPage.id);
  const metadata = notionMetaDataToObsidianMetaData(notionPage);
  const markdownContent = flattenNotionPage(fullNotionPage);

  return metadata + markdownContent;
};

const getNotionPage = async (pageId) => {
  return NotionAxios.get(`/pages/${pageId}`);
};

const getNotionBlock = async (blockId) => {
  return NotionAxios.get(`/blocks/${blockId}`);
};

const getNotionBlockChildren = async (blockId) => {
  return NotionAxios.get(`/blocks/${blockId}/children?page_size=${PAGE_SIZE}`);
};

const getNotionPageContent = async (pageId) => {
  const response = await getNotionBlockChildren(pageId);
  const content = await Promise.all(
    response.data.results.map(async (block) => {
      if (block.has_more) console.warning("NEED TO HANDLE PAGINATION");

      // Load data from any synced block
      if (block.synced_block && block.synced_block.synced_from) {
        const newBlock = (
          await getNotionBlock(block.synced_block.synced_from.block_id)
        ).data;

        // Load any children
        return await loadBlockChildren(newBlock);
      }

      // Load any children
      return await loadBlockChildren(block);
    })
  );

  return content;
};

const loadBlockChildren = async (block) => {
  if (!block.has_children) return block;

  const children = await getNotionPageContent(block.id);
  return {
    children: children,
    ...block,
  };
};

const flattenNotionPage = (notionPage) => {
  return notionPage.reduce(
    (current, childBlock) => current + flattenNotionBlock(childBlock),
    ""
  );
};

const flattenNotionBlock = (block) => {
  if (block.has_children && block.children.length) {
    const flattenedChildren = block.children.reduce(
      (current, childBlock) => current + flattenNotionBlock(childBlock),
      ""
    );
    // console.log(blockToMarkdownContent(block, flattenedChildren));
    return blockToMarkdownContent(block, flattenedChildren);
  }

  // console.log(blockToMarkdownContent(block));
  return blockToMarkdownContent(block);
};

const blockToMarkdownContent = (block, children = null) => {
  // Bookmark
  if (block.type === "bookmark") {
    return `[${block.bookmark.caption}](${block.url})`;
  }

  // TODO: Breadcrumb
  if (block.type === "breadcrumb") {
    return ``;
  }

  if (block.type === "bulleted_list_item") {
    return `* ${flattenNotionRichTextArray(
      block.bulleted_list_item.rich_text
    )}\n`;
  }

  // TODO: add color and icon support?
  if (block.type === "callout") {
    return `\`\`\`ad-note\ntitle:${flattenNotionRichTextArray(
      block.callout.rich_text
    )}\ncolor: ${notionColorToAdmonitionColor(block.callout.color)}\n${
      children || ""
    }\n\`\`\``;
  }

  // TODO: child_database
  if (block.type === "child_database") {
    return ``;
  }

  // TODO: child_page
  if (block.type === "child_page") {
    return ``;
  }

  if (block.type === "code") {
    return `\`\`\`\n${children || ""}\n\`\`\`\n`;
  }

  // TODO: Can we handle multiple columns in Obsidian?
  if (block.type === "column_list") {
    return `${children || ""}`;
  }

  if (block.type === "column") {
    return `${children || ""}`;
  }

  if (block.type === "divider") {
    return `---\n`;
  }

  // TODO: file
  if (block.type === "file") {
    return ``;
  }

  if (block.type === "heading_1") {
    return `# ${flattenNotionRichTextArray(block.heading_1.rich_text)}\n${
      children || ""
    }`;
  }

  if (block.type === "heading_2") {
    return `## ${flattenNotionRichTextArray(block.heading_2.rich_text)}\n${
      children || ""
    }`;
  }

  if (block.type === "heading_3") {
    return `### ${flattenNotionRichTextArray(block.heading_3.rich_text)}\n${
      children || ""
    }`;
  }

  // TODO: image
  if (block.type === "image") {
    return ``;
  }

  // TODO: database
  if (block.type === "database") {
    return ``;
  }

  // TODO: date
  if (block.type === "date") {
    return ``;
  }

  // TODO: Can we preview links in Obsidian?
  if (block.type === "link_preview") {
    return `![${block.link_preview.url}](${block.link_preview.url})`;
  }

  // TODO: page
  if (block.type === "page") {
    return ``;
  }

  // TODO: user
  if (block.type === "user") {
    return ``;
  }

  // TODO: Figure out a better way of handling numbered lists
  if (block.type === "numbered_list_item") {
    return `* ${flattenNotionRichTextArray(
      block.numbered_list_item.rich_text
    )}\n`;
  }

  if (block.type === "paragraph") {
    return `${flattenNotionRichTextArray(block.paragraph.rich_text)}\n`;
  }

  // TODO: pdf
  if (block.type === "pdf") {
    return ``;
  }

  // TODO: synced_block
  if (block.type === "synced_block") {
    return ``;
  }

  // TODO: table
  if (block.type === "table") {
    return ``;
  }

  // TODO: table_row
  if (block.type === "table_row") {
    return ``;
  }

  // TODO: table_of_contents
  if (block.type === "table_of_contents") {
    return ``;
  }

  if (block.type === "to_do") {
    return `- [${block.checked ? "x" : " "}] ${flattenNotionRichTextArray(
      block.to_do.rich_text
    )}\n${children || ""}`;
  }

  if (block.type === "toggle") {
    return `${flattenNotionRichTextArray(block.toggle.rich_text)}\n${
      children || ""
    }`;
  }

  // TODO: video
  if (block.type === "video") {
    return ``;
  }
};

const flattenNotionRichTextArray = (notionRichTextArray) => {
  if (!notionRichTextArray.length) return "";

  return notionRichTextArray.reduce(
    (current, richText) => current + notionRichTextToMarkDown(richText),
    ""
  );
};

const notionRichTextToMarkDown = (notionRichText) => {
  let outputString = notionRichText.plain_text;

  // * Handle equations
  if (notionRichText.type === "equation") return outputString;

  // TODO: Handle mentions
  // * https://developers.notion.com/reference/rich-text#mention
  if (notionRichText.type === "mention") return outputString;

  // * Handle normal rich text
  if (notionRichText.annotations.bold) outputString = `**${outputString}**`;
  if (notionRichText.annotations.italic) outputString = `*${outputString}*`;
  if (notionRichText.annotations.strikethrough)
    outputString = `~~${outputString}~~`;
  if (notionRichText.annotations.code) outputString = `\`${outputString}\``;

  // ! Obsidian doesn't support underlining, so we don't do anything
  if (notionRichText.annotations.underline) outputString = `${outputString}`;
  // ! Obsidian doesn't support text color, so we don't do anything
  if (notionRichText.annotations.color) outputString = `${outputString}`;

  // TODO: Not sure if styling above should be inside or outside of the link...
  if (notionRichText.href)
    outputString = `[${outputString}](${notionRichText.href})`;

  return outputString;
};

const notionColorToAdmonitionColor = (notionColor) => {
  switch (notionColor) {
    case "blue":
    case "blue_background":
      return "0, 0, 255";
    case "brown":
    case "brown_background":
      return "165, 42, 42";
    case "gray":
    case "gray_background":
      return "150, 150, 150";
    case "green":
    case "green_background":
      return "0, 255, 0";
    case "orange":
    case "orange_background":
      return "255, 191, 0";
    case "yellow":
    case "yellow_background":
      return "255, 234, 0";
    case "pink":
    case "pink_background":
      return "255, 192, 203";
    case "purple":
    case "purple_background":
      return "255, 0, 255";
    case "red":
    case "red_background":
      return "255, 0, 0";
    default:
      return "";
  }
};

const notionMetaDataToObsidianMetaData = (notionMetaData) => {
  const {
    created_by: _created_by,
    icon: _emoji,
    last_edited_by: _last_edited_by,
    object: _object,
    parent: _parent,
    properties: properties,
    ...metadata
  } = notionMetaData;

  // TODO: Convert created_time
  // TODO: Convert last_edited_time
  // TODO: Pull out all the properties
  // TODO: Handle linking to weekly/monthly/yearly notes

  Object.keys(properties).forEach((property) => {
    switch (property) {
      // TODO: Any formula field doesn't need to be explicitely ignored, 
      // Propertyies we're ignoring
      case "Updated":
      case "Updated (short)":
      case "URL":
      case "URL Base":
      case "archived":
      case "Root Area":
      case "Root Area":
      case "Project":
      case "Project Archived":
      case "Pulls":
        break;
      default:
        const value = notionPropertyToObsidianProperty(
          properties[property]);
        if (value !== null) metadata[property] = value;
    }
  });

  const formattedMetaData = Object.keys(metadata).reduce(
    (previous, current) => {
      return previous
        ? previous + `${current}: ${metadata[current]}\n`
        : `${current}: ${metadata[current]}\n`;
    },
    ""
  );
  return `---\n${formattedMetaData}---\n`;
};

// TODO: Fill out all the properties
const notionPropertyToObsidianProperty = (notionProperty) => {
  if (notionProperty.type === "formula") return null;
  
  if (notionProperty.type === "relation") return null;
  
  if (notionProperty.type === "multi_select") {

  }
  
  if (notionProperty.type === "rich_text") {
    return flattenNotionRichTextArray(notionProperty.rich_text) || null;
  }
  
  if (notionProperty.type === "select") {
    return notionProperty.select;
  }
  
  if (notionProperty.type === "date") {
    return notionProperty.date;
  }
  
  if (notionProperty.type === "checkbox") {
    return notionProperty.checkbox;
  }
  
  if (notionProperty.type === "title") {
    return flattenNotionRichTextArray(notionProperty.title) || "";
  }
  
  if (notionProperty.type === "url") {
    return notionProperty.url;
  }

  return null;
};
