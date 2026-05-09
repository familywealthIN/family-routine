module.exports = {
    transpileDependencies: [
        '@routine-notes/ui',
    ],
    configureWebpack: {
        resolve: {
            symlinks: false,
        },
    },
    chainWebpack: (config) => {
        config.module.rule('js').exclude.add(/\.stories\.js$/);
        config.plugins.delete('prefetch');
        const oneOfsMap = config.module.rule('stylus').oneOfs.store;
        oneOfsMap.forEach((item) => {
            item
                .use('stylus-loader')
                .loader('stylus-loader')
                .tap((options) => {
                    if (options.preferPathResolver) {
                        delete options.preferPathResolver;
                    }
                    return options;
                });
        });
    },
    lintOnSave: false,
};
