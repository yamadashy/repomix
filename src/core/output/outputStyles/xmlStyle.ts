import Handlebars from 'handlebars';
import type { OutputGeneratorContext } from '../outputGeneratorTypes.js';
import {
  generateHeader,
  generateSummaryAdditionalInfo,
  generateSummaryFileFormat,
  generateSummaryNotes,
  generateSummaryPurpose,
  generateSummaryUsageGuidelines,
} from '../outputStyleDecorate.js';

export const generateXmlStyle = (outputGeneratorContext: OutputGeneratorContext) => {
  const template = Handlebars.compile(xmlTemplate);

  const renderContext = {
    generationHeader: generateHeader(outputGeneratorContext.generationDate),
    summaryPurpose: generateSummaryPurpose(),
    summaryFileFormat: generateSummaryFileFormat(),
    summaryUsageGuidelines: generateSummaryUsageGuidelines(
      outputGeneratorContext.config,
      outputGeneratorContext.instruction,
    ),
    summaryNotes: generateSummaryNotes(outputGeneratorContext.config),
    summaryAdditionalInfo: generateSummaryAdditionalInfo(),
    headerText: outputGeneratorContext.config.output.headerText,
    instruction: outputGeneratorContext.instruction,
    treeString: outputGeneratorContext.treeString,
    includedFiles: outputGeneratorContext.includedFiles,
    partNumber: outputGeneratorContext.partNumber,
    totalParts: outputGeneratorContext.totalParts,
    totalPartFiles: outputGeneratorContext.includedFiles.length,
    totalFiles: outputGeneratorContext.totalFiles
  };

  return `${template(renderContext).trim()}\n`;
};

const xmlTemplate = /* xml */ `
{{{generationHeader}}}

<file_summary>
This section contains a summary of this file.

<purpose>
{{{summaryPurpose}}}
</purpose>

<file_format>
{{{summaryFileFormat}}}
4. Repository files, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
{{{summaryUsageGuidelines}}}
</usage_guidelines>

<repository_size>
This file is part {{{partNumber}}} of {{{totalParts}}} of a split representation of the entire codebase.
This file contains {{{totalPartFiles}}} out of a total of {{{totalFiles}}} files.

</repository_size>

<notes>
{{{summaryNotes}}}
</notes>

<additional_info>
{{#if headerText}}
<user_provided_header>
{{{headerText}}}
</user_provided_header>
{{/if}}

{{{summaryAdditionalInfo}}}
</additional_info>

</file_summary>

<repository_structure>
{{{treeString}}}
</repository_structure>

<repository_files>
This section contains the contents of the repository's files.

{{#each includedFiles}}
<file path="{{{this.path}}}">
{{{this.content}}}
</file>

{{/each}}
</repository_files>

{{#if instruction}}
<instruction>
{{{instruction}}}
</instruction>
{{/if}}
`;
