# Personal profile fonts

The personal paper profile in this website uses **MiSans** for Chinese text and Chinese punctuation, and **Montserrat** for Latin text, numerals and other symbols. `profile-fonts.css` limits the profile typography to the paper's printed surfaces and the small text on its reverse. `site-details.css` additionally uses a dedicated static Montserrat Medium 500 subset (`SimoMontserratMetrics`) for `.metric-value`, and the shared real Italic 400 subset for `.story-subtitle`. Their original Georgia/serif fallback remains in place for Chinese. Navigation, cassettes, metadata and other sans-serif text retain their existing type.

## Copyright and licenses

- **MiSans** — Copyright © 2020–2025 Beijing Xiaomi Mobile Software Co., Ltd. All Rights Reserved. Used under the original [MiSans Font Intellectual Property License Agreement](MiSans-LICENSE.pdf), included unchanged. Xiaomi's [official FAQ](https://hyperos.mi.com/font/zh/faq/) permits embedded use and requires the software to identify its use of MiSans. The original agreement and copyright notices are retained in this package and font metadata. MiSans is embedded as part of this website; these files are not a standalone font distribution.
- **Montserrat** — Copyright 2011 The Montserrat Project Authors (https://github.com/JulietaUla/Montserrat). The official repository's license additionally carries Copyright 2024 The Montserrat.Git Project Authors. Licensed under the [SIL Open Font License 1.1](Montserrat-OFL.txt), included unchanged.

## Official sources

Retrieved 2026-11-13. No third-party font packages or system-installed fonts were used.

- MiSans: [Xiaomi's download page](https://hyperos.mi.com/font/zh/download/) and its [official MiSans download](https://hyperos.mi.com/font-download/MiSans.zip). Source files: `MiSans/ttf/MiSans-Regular.ttf`, `MiSans/ttf/MiSans-Demibold.ttf`, `MiSans/ttf/MiSans-Bold.ttf`.
- Montserrat: [the authors' official repository](https://github.com/JulietaUla/Montserrat), static files under [`fonts/ttf`](https://github.com/JulietaUla/Montserrat/tree/master/fonts/ttf): `Montserrat-Regular.ttf`, `Montserrat-Medium.ttf`, `Montserrat-SemiBold.ttf`, `Montserrat-Italic.ttf`.

## Embedded assets

All seven webfonts are **static WOFF2**. They have no `fvar` table and no variable axes. They were made with FontTools 4.60.2 from the official static fonts by retaining the characters actually printed in the main and alternate paper profiles and the four projects' reader subtitles and metric values, separately for each used weight and style. Original glyph outlines, hinting, copyright and license metadata are retained. CSS uses local aliases (`SimoMiSans`, `SimoMontserrat`, `SimoMontserratMetrics`); the fonts' original internal names are retained.

The paper hierarchy follows the resume reference: name 700, company/role/entry headings 600, body and supporting text 400, dates 400 italic. The MiSans static sources are Regular / Demibold / Bold at the corresponding conventional CSS labels; no synthetic bold or italic is used. The dedicated 500 file contains only metric characters and loads only when that family is used in a project detail. Its CSS face is matched at 400 while its actual static source and outlines are Medium 500, so Chinese units continue to use their original regular 400 fallback. On 2026-11-16, its subset was rebuilt from the same verified official source to add only `W` for the displayed `661.8W` metric; the other six WOFF2 files are unchanged. It does not affect the paper's font matching. No unused Montserrat 700 is bundled.

`font-manifest.json` records each source SHA-256, embedded file SHA-256, exact Unicode coverage, glyph count, byte size and font tables. Its `fontBytes` is the total compressed WOFF2 download size, **not** a measured browser memory allocation. Full original fonts, archives and build dependencies are deliberately excluded from the website.

If either paper's copy, a project subtitle or a metric value changes, rebuild the affected subsets and Unicode ranges before release. They intentionally cover only the current displayed copy.
