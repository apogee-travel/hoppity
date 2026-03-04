export default new Map([
    [
        "src/content/docs/guide/introduction.mdx",
        () =>
            import(
                "astro:content-layer-deferred-module?astro%3Acontent-layer-deferred-module=&fileName=src%2Fcontent%2Fdocs%2Fguide%2Fintroduction.mdx&astroContentModuleFlag=true"
            ),
    ],
    [
        "src/content/docs/guide/getting-started.mdx",
        () =>
            import(
                "astro:content-layer-deferred-module?astro%3Acontent-layer-deferred-module=&fileName=src%2Fcontent%2Fdocs%2Fguide%2Fgetting-started.mdx&astroContentModuleFlag=true"
            ),
    ],
    [
        "src/content/docs/index.mdx",
        () =>
            import(
                "astro:content-layer-deferred-module?astro%3Acontent-layer-deferred-module=&fileName=src%2Fcontent%2Fdocs%2Findex.mdx&astroContentModuleFlag=true"
            ),
    ],
]);
