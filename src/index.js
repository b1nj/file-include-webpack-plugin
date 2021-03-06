const path = require('path')
const fs = require('fs')
const utils = require('./utils')

class FileIncludeWebpackPlugin {
  constructor(config) {
    this.source = config.source // source from the context
    this.replace = config.replace
    this.context = null
    this.destination = config.destination

    // handlers
    this.process = this.process.bind(this)
  }

  processFile(compilation, file) {
    let content = fs.readFileSync(file, 'utf-8')
    const incRegex = new RegExp(/@@include\('([.\-\w\/]*)'(,\s?(\s?{[\W\w\s\d:,\[\]{}"]*}\s?))?\)/, 'g');

    content = content.replace(incRegex, (reg, partial, _args, args) => {
      const partialPath = path.join(this.context, partial)

      // add partials and templates to watch
      compilation.fileDependencies.add(partialPath)
      compilation.fileDependencies.add(file)

      return utils.getFileContent(partialPath, args)
    })

    if (this.replace) {
      this.replace.forEach(conf => {
        content = content.replace(conf.regex, conf.to)
      })
    }

    return content
  }

  process(compilation, callback) {
    const { context, output } = this.compiler.options
    this.context = path.join(context, this.source)
    const files = utils.getRequiredFiles(this.context, '')

    utils.logger.info(`Working on ${files.length} .html files`)

    files.forEach(file => {
      const sourcePath = path.join(this.context, file)
      const destinationPath = this.destination ? path.join(this.destination, file) : file
      const content = this.processFile(compilation, sourcePath)

      compilation.assets[destinationPath] = {
        source: () => content,
        size: () => content.length
      }
    })

    callback()
  }

  apply(compiler) {
    this.compiler = compiler
    compiler.hooks.emit.tapAsync('FileIncludeWebpackPlugin', this.process)
  }
}

module.exports = FileIncludeWebpackPlugin
