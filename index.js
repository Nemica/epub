#! /usr/bin/env node

import AdmZip from 'adm-zip';
import { Constants } from 'adm-zip/util/index.js';
import commandLineArgs from 'command-line-args';
import { readFile, writeFile } from 'fs/promises';
import util from 'util';
import path from 'path';
import { homedir } from 'os';
import { createHash } from 'crypto';
import { cliArguments, printHelp } from './help.js';

const cliArgs = commandLineArgs(cliArguments);
const opfPath = 'content/content.opf';
const now = new Date(Math.floor(Date.now() / 1000) * 1000);
let metaData;

if (cliArgs.help) {
  printHelp();
  process.exit(0);
}

// sanity check
if (!cliArgs.content) {
  if (!cliArgs.meta) {
    console.error(`Invalid arguments, no content files given.`);
    printHelp();
    process.exit(-1);
  }

  await writeFile(path.join(homedir(), '.epub-meta'), await readFile(cliArgs.meta));
  process.exit(0);
} 

metaData = await parseMetadata(cliArgs.meta);

const epubFile = setupZipFile();
const contentElements = await processContent();
epubFile.addFile(opfPath, Buffer.from(generateOpf(metaData, contentElements)));
epubFile.addFile('content/toc.xhtml', Buffer.from(generateToc(contentElements)));

try {
  const filesafeTitle = metaData.title.replace(/[\s:\\/'"]/g, '_');
  writeFile(util.format(cliArgs.output, filesafeTitle || 'untitled'), epubFile.toBuffer());
  console.log(`Write file to ${util.format(cliArgs.output, filesafeTitle || 'untitled')}`);  
} catch (e) {
  console.error(e);
}

function setupZipFile() {
  const zip = new AdmZip(null, {noSort: true});
  // do not compress this file, it contributes to the magic numbers
  const mimetypeFile = zip.addFile('mimetype', Buffer.from('application/epub+zip'));
  mimetypeFile.header.method = Constants.STORED;
  zip.addFile('META-INF/container.xml', generateContainer());
  zip.addFile('content/css/style.css', Buffer.from('.chapter { page-break-after: always; } .scene-split { text-align: center; }'));
  
  return zip;
}

function generateContainer() {
  return `<?xml version="1.0"?>
  <container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
    <rootfiles>
      <rootfile full-path="${opfPath}" media-type="application/oebps-package+xml"/>
    </rootfiles>
  </container>`;
}

async function processContent() {
  const rawContentElements = [];
  const contentElements = [];
  for (const content of cliArgs.content) {
    try {
      const fileContent = (await readFile(content)).toString();
      const formattedContent = formatContent(fileContent);

      rawContentElements.push(...formattedContent);
    } catch (e) {
      console.warn(e);
    }
  }

  for (const i in rawContentElements) {
    epubFile.addFile(`content/chapters/ch${i*1 + 1}.xhtml`, Buffer.from(wrapFormattedContent(rawContentElements[i])[0]));
      
    contentElements.push({
      number: i*1 + 1,
      title: rawContentElements[i].title || `Chapter ${i*1 + 1}`,
      file: `ch${i*1 + 1}.xhtml`
    })
  }

  return contentElements;
}

function generateOpf(metaData, content) {
  const firstContentTitle = (cliArgs.content || [])[0]?.match(/[\\/]([^\\/]+?)\.[a-zA-Z]*$/);
  const title = metaData.title || firstContentTitle && firstContentTitle[1] || 'Untitled';
  const titleHash = createSha256(title);
  const spineElements = [];
  let opfContent = '<?xml version="1.0" encoding="UTF-8"?>';
  opfContent += '<package xmlns="http://www.idpf.org/2007/opf" xmlns:opf="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookID">';
  
  // metadata
  
  opfContent += '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">';
  opfContent += `<dc:identifier id="BookID">${metaData.id || titleHash}</dc:identifier>`;
  opfContent += `<dc:title>${title}</dc:title>`;
  opfContent += `<dc:language>${metaData.language || 'en'}</dc:language>`;
  // opfContent += '<dc:publisher>The publisher</dc:publisher>';
  opfContent += `<dc:creator>${metaData.author || 'Anonymous Author'}</dc:creator>`;
  opfContent += `<dc:date>${(metaData.date ? new Date(Math.floor((new Date(metaData.date)).valueOf() / 1000) * 1000) : now).toISOString().replace('.000', '')}</dc:date>`;
  if (metaData.contributors?.length) {
    opfContent += metaData.contributors.map(contributor => `<dc:contributor>${contributor}</dc:contributor>`);
  }
  if (metaData.description) {
    opfContent += `<dc:description>${metaData.description}</dc:description>`;
  }
  opfContent += `<dc:rights>© ${metaData.author || 'original author'}, ${(now.getFullYear())}</dc:rights>`;
  opfContent += `<meta property="dcterms:modified">${now.toISOString().replace('.000', '')}</meta>`;
  opfContent += '</metadata>';
  
  // manifest
  
  opfContent += '<manifest>';
  opfContent += '<item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>';
  opfContent += '<item id="stylesheet" href="css/style.css" media-type="text/css"/>';
  for (const contentElement of content) {
    opfContent += `<item id="chapter-${contentElement.number}" href="chapters/${contentElement.file}" media-type="application/xhtml+xml"/>`;
    spineElements.push(`chapter-${contentElement.number}`);
  }
  
  opfContent += '</manifest>';
  
  // spine
  
  opfContent += '<spine>';
  for (const spineElement of spineElements) {
    opfContent += `<itemref idref="${spineElement}"/>`;
  }
  opfContent += '</spine>';
  
  opfContent += '</package>';
  
  return opfContent;
}

function generateToc(content) {
  return `<?xml version="1.0" encoding="UTF-8" ?>
  <html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" xmlns:epub="http://www.idpf.org/2007/ops">
    <head>
      <title>Table of contents</title>
    </head>
    <body>
      <nav role="doc-toc" epub:type="toc" id="toc">
        <ol>` +
        content.map((c, idx) => `<li><a href="chapters/ch${idx + 1}.xhtml">${c.title}</a></li>`).join('\n')
        + `</ol>
      </nav>
    </body>
  </html>`
}

async function parseMetadata(metaFile) {
  let metaData = {};
  try {
    metaData = JSON.parse(await readFile(path.join(homedir(), '.epub-meta')));
  } catch (e) {
  }

  try {
    const parsedMetadata = cliArgs.meta ? JSON.parse(await readFile(cliArgs.meta)) : {};
    metaData = {...metaData, ...parsedMetadata};
  } catch (e) {
    console.error(e);
  }

  if (cliArgs.title) metaData.title = cliArgs.title;
  if (cliArgs.author) metaData.author = cliArgs.author;

  return metaData;
}

function wrapFormattedContent(formattedContent) {
  if (!Array.isArray(formattedContent)) {
    formattedContent = [formattedContent];
  }
  return formattedContent.map(fc => {
    return `<?xml version="1.0" encoding="UTF-8" ?>
    <html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
      <head>
        <title>${fc.title}</title>
        <link rel="stylesheet" href="../css/style.css"/>
      </head>
      <body>
        ${fc.content}
      </body>
    </html>`
  });
}

function formatContent(raw) {
  let italics = 0;
  let bolds = 0;
  let strikes = 0;
  return raw.replace(/_/g, () => {
    if(italics++ % 2) {
      return '</i>';
    } else {
      return '<i>';
    }
  }).replace(/\*/g, () => {
    if(bolds++ % 2) {
      return '</b>';
    } else {
      return '<b>';
    }
  }).replace(/~~/g, () => {
    if(strikes++ % 2) {
      return '</span>';
    } else {
      return '<span style="text-decoration: line-through">';
    }
  }).split(/\r?\n\r?\n\r?\n/g).map(ch => {
    let title;
    const scenes = ch.split(/\r?\n\r?\n/g).map(sc => {
      const paragraphs = sc.split(/\r?\n/g).map(p => {
        if(p.startsWith('#')) {
          title = p.replace(/^#+\s*/, '');
          return `<h2>${p.replace(/^#+\s*/, '')}</h2>`;
        } else if(p.startsWith('>')) {
          return `<code>${p.replace(/^>+\s*/, '')}</code>`;
        } else {
          return `<p>${p}</p>`;
        }
      });
      return paragraphs.join('');
    });
    return {
      title,
      content: `<div class="chapter">${scenes.join('<div class="scene-split">* * *</div>')}</div>`
    };
  });
}

function createSha256(str) {
  return createHash('sha256').update(str).digest('hex');
}