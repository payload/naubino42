module.exports = {
    entry: "./src/main-react.tsx",
    output: {
        filename: "index.js",
        path: __dirname + "/dist"
    },
    devtool: "source-map",
    resolve: {
        extensions: [
            ".ts",
            ".tsx",
            ".js",
            ".jsx"
        ]
    },
    module: {
        rules: [
            { test: /\.tsx?$/, loader: "awesome-typescript-loader" },
            { enforce: "pre", test: /\.js$/, loader: "source-map-loader" }
        ]
    },
    externals: {
    },
};

