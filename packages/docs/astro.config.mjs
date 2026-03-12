import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightTypeDoc, { typeDocSidebarGroup } from "starlight-typedoc";
import starlightThemeNova from "starlight-theme-nova";

export default defineConfig({
    site: "https://apogee-travel.github.io",
    base: "/hoppity",
    vite: {
        ssr: {
            noExternal: ["nanoid", "zod"],
        },
    },
    integrations: [
        starlight({
            title: "hoppity",
            logo: {
                light: "./src/assets/logo-light.svg",
                dark: "./src/assets/logo-dark.svg",
                replacesTitle: true,
            },
            description:
                "Pattern-driven RabbitMQ topology builder for Node.js microservices, built on Rascal.",
            favicon: "/hoppity/favicon.svg",
            head: [
                {
                    tag: "link",
                    attrs: {
                        rel: "icon",
                        href: "/hoppity/favicon.ico",
                        sizes: "32x32",
                    },
                },
                {
                    tag: "link",
                    attrs: {
                        rel: "icon",
                        href: "/hoppity/favicon-16x16.png",
                        sizes: "16x16",
                        type: "image/png",
                    },
                },
                {
                    tag: "link",
                    attrs: {
                        rel: "apple-touch-icon",
                        href: "/hoppity/apple-touch-icon.png",
                    },
                },
                {
                    tag: "link",
                    attrs: {
                        rel: "manifest",
                        href: "/hoppity/site.webmanifest",
                    },
                },
                {
                    tag: "meta",
                    attrs: {
                        property: "og:image",
                        content: "/hoppity/og-image.png",
                    },
                },
            ],
            customCss: ["./src/styles/custom.css"],
            plugins: [
                starlightThemeNova(),
                starlightTypeDoc({
                    entryPoints: ["../hoppity/src/index.ts"],
                    tsconfig: "../hoppity/tsconfig.json",
                    sidebar: { label: "Core API" },
                }),
            ],
            social: [
                {
                    icon: "github",
                    label: "GitHub",
                    href: "https://github.com/apogee-stealth/hoppity",
                },
                {
                    icon: "npm",
                    label: "npm",
                    href: "https://www.npmjs.com/package/@apogeelabs/hoppity",
                },
            ],
            sidebar: [
                {
                    label: "Guide",
                    items: [
                        { slug: "guide/introduction" },
                        { slug: "guide/getting-started" },
                        { slug: "guide/concepts" },
                        { slug: "guide/interceptors" },
                    ],
                },
                typeDocSidebarGroup,
                {
                    label: "hoppity-open-telemetry",
                    collapsed: true,
                    items: [{ slug: "packages/hoppity-open-telemetry" }],
                },
                {
                    label: "Examples",
                    items: [
                        { slug: "examples/overview" },
                        { slug: "examples/basic-pubsub" },
                        { slug: "examples/bookstore" },
                    ],
                },
            ],
        }),
    ],
});
