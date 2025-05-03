# EPUB

`epub` is a command line tool for generating epub files from text and metadata files.

## Installation

```npm install @nemica/epub --global```

## Usage

```epub my_booktext.txt -t "My Book"```

```epub my_booktext.txt -t "My Book" -o "%s-first-edition.epub```

```epub my_booktext.txt -m my_metadata.json```

Usage hints can be found by typing `epub -?` or `epub --help`.

## Text Format

As this tool is a private project, it uses a markdown-like format I've been using for my own works.

- **bold**: `*bold*`
- *italics*: `_italics_`
- ~~strikethrough~~: `~~strikethrough~~`
- chapter heading: `#heading`
- monospace/code: `>monospace`
- scene break: `\n\n`
- chapter break: `\n\n\n`

Multiple files will be handled as multiple chapters, but more than one chapter can be in one file.

### Examples

```
#Foreword
This is a foreword.
It has multiple paragraphs.


#The Basics
This is the first proper chapter.
It also has multiple paragraphs.

It even has multiple scenes.
```
This will generate two chapters, titled Foreword and The Basics respectively.

```
This chapter has no heading. Make of that what you will.
```
This will generate a single chapter, titled Chapter 1. Chapter numbers increase automatically.
