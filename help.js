import path from 'path';
import commandLineUsage from 'command-line-usage';

const cliName = 'epub';
const cwd = process.cwd();

export const cliArguments = [{
  name: 'help',
  alias: '?',
  type: Boolean,
  description: 'Prints this usage guide.'
}, {
  name: 'content',
  type: String,
  typeLabel: '{underline file} ...',
  multiple: true,
  defaultOption: true,
  description: 'The file(s) you want to add to your epub.'
}, {
  name: 'title',
  alias: 't',
  type: String,
  description: 'The book\'s title. Overwrites metadata file.'
}, {
  name: 'author',
  alias: 'a',
  type: String,
  description: 'The book\'s author. Overwrites metadata file.'
}, {
  name: 'meta',
  alias: 'm',
  type: String,
  description: 'A file with metadata to use in your epub. Specifying a metadata file without book data saves it as default metadata in .epub-meta in your home directory.'
}, {
  name: 'output',
  alias: 'o',
  type: String,
  typeLabel: '{underline file}',
  defaultValue: path.join(cwd, '%s.epub'),
  description: 'The location of the final file.'
}];

export function printHelp() {
  console.log(commandLineUsage([{
    header: `About ${cliName}`,
    content: 'Converts marked-up plaintext files to an epub file.'
  }, {
    header: 'Options',
    optionList: cliArguments
  }, {
    header: 'Content markup',
    content: [{
      desc: '{bold Bold}:',
      example: '*bold*',
    }, {
      desc: '{italic Italic}:',
      example: '_italic_',
    }, {
      desc: '{strikethrough Strikethrough}:',
      example: '~~strikethrough~~',
    }, {
      desc: 'Heading:',
      example: '#heading'
    }, {
      desc: 'Blockquote:',
      example: '>blockquote'
    }]
  }, {
    header: 'Meta file contents',
    content: [{
      name: 'id',
      desc: 'Unique book identifier (ISBN, UUID,...)'
    }, {
      name: 'title',
      desc: 'The book\'s title.'
    }, {
      name: 'language',
      desc: 'The language the book is written in, specified as an ISO 639 code.'
    }, {
      name: 'author',
      desc: 'The book\'s primary author.'
    }, {
      name: 'date',
      desc: 'The original publishing date, formatted as YYYY-MM-DD. This is not the date of the last modification.'
    }, {
      name: 'contributors',
      desc: 'Other authors and contributors, specified as an array of strings.'
    }, {
      name: 'description',
      desc: 'A short description, or blurb, of the book\'s contents.'
    }]
  }]));
}