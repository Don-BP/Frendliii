module.exports = function (api) {
    api.cache(true);
    return {
        presets: [
            ["babel-preset-expo", { jsxImportSource: "nativewind" }],
            "nativewind/babel",
        ],
        plugins: [
            "@babel/plugin-syntax-import-meta",
            "react-native-reanimated/plugin",
            // Added custom transform to handle import.meta in the experimental versions
            function ({ types: t }) {
                return {
                    visitor: {
                        MetaProperty(path) {
                            if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
                                path.replaceWith(t.objectExpression([]));
                            }
                        },
                    },
                };
            },
        ],
    };
};
