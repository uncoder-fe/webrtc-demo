const HtmlPlugin = require('html-webpack-plugin');
const path = require('path')

module.exports = {
    mode: 'development',
    entry: {
        "app": './src/app.js',
        "app-chat": './src/app-chat.js'
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist')
    },
    devServer: {
        allowedHosts: 'all',
        // static: {
        //     // publicPath: './',
        //     directory: path.join(__dirname, 'public'),
        // },
        compress: true,
        port: 1234,
    },
    plugins: [new HtmlPlugin({
        template: path.join(__dirname, 'public', 'index.html'), // public中，你的html叫什么
        chunks: ['app'],
        filename: 'index.html' // 打包后的html叫什么（这个文件会生成到dist文件夹）
    }), new HtmlPlugin({
        template: path.join(__dirname, 'public', 'chat.html'), // public中，你的html叫什么
        chunks: ['app-chat'],
        filename: 'chat.html' // 打包后的html叫什么（这个文件会生成到dist文件夹）
    })]
}