---
title: "Creating SVG React Component with a single terminal command"
id: "8ffc7a8d4248416a96d24e779d8a2dc3"
slug: "creating-svg-react-component-with-a-single-terminal-command"
source_url: "https://adams-blog.notion.site/Creating-SVG-React-Component-with-a-single-terminal-command-8ffc7a8d4248416a96d24e779d8a2dc3"
extracted_at: "2026-10-30T19:38:35.112Z"
cover: null
---

# Creating SVG React Component with a single terminal command

<a id="fc7f5586e2814886bed2eb783629e969"></a>

<a id="9b975bf4c5664a29941d04ad4a591002"></a>

> This is only possible by utilizing the [svgr](https://react-svgr.com/docs/cli/) npm module to render the component

<a id="e6cc52ec3ddf4a64b4f74b4273c03985"></a>

> This only works if you are either using VS Code, or have VSC Insiders aliased to `code`

<a id="0eb431fadd564c128390b2e6b19aa63c"></a>

### Generate from an URL

<a id="00a5d212a3a24e5799d605652091e551"></a>

1. First you need to find an SVG on the internet
   
   <a id="2a2b6e4dcd94486998c991f7ef284f90"></a>
   
   (I suggest [SVGRepo](https://www.svgrepo.com/) for finding open-source SVGs)

<a id="b4063cecd93f46e488ee875e842ae091"></a>

1. Then right-click and “Copy Image Address”

<a id="33608040abbb4498a3b1ad603d1c35d9"></a>

1. Then you just need to paste the url into this command
   
   <a id="2bc20ada6b274c668ca59d6aceb26389"></a>
   
   ```
   curl "https://www.svgrepo.com/show/414849/education-library-metting.svg" \
   | npx @svgr/cli \
   | code -&
   ```

<a id="0d4ec452f99e457b81b707ca00acc1d8"></a>

1. This should open up into a temporary file inside of VS Code
   
   <a id="84c07a8b5bd841e99c8f857bc53abcb6"></a>
   
   Once the generation is completed, it will create the SVG component right there in the editor

<a id="ad0fdfe81479469283c739fd960ceb6b"></a>

1. Done! 🎉

<a id="3119d11c0fd1464ba9e68a03368982d0"></a>

### Generate from a file

<a id="629ce964e92045a082f0ecd8c6b640e5"></a>

1. Since we already have the file we don’t need to `curl` to grab it, and instead we can use `cat` to output the files contents directly to stdout

<a id="0b1232414095426d9f434befb502a367"></a>

```
cat temp.svg | npx @svgr/cli | code -&
```

<a id="c21be6340b9841cfa71ab22e91a63d42"></a>

1. This should open up into a temporary file inside of VS Code
   
   <a id="94eab0a25e774bbba6157bac46a76c2d"></a>
   
   Once the generation is completed, it will create the SVG component right there in the editor

<a id="7ae9f28fcea44a42adc54d2f56ed47b1"></a>

1. Done! 🎉
