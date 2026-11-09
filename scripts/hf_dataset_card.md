---
language:
- ar
license: cc-by-4.0
pretty_name: Arabic Verbs Statistics Tables (جداول إحصاء الأفعال العربية)
tags:
- arabic
- morphology
- verbs
- lexicon
- linguistics
- roots
- transitivity
size_categories:
- 10K<n<100K
configs:
- config_name: verbs
  data_files: data/verbs.parquet
  default: true
- config_name: triliteral_bare
  data_files: data/triliteral_bare.parquet
- config_name: triliteral_augmented
  data_files: data/triliteral_augmented.parquet
- config_name: quadriliteral_bare
  data_files: data/quadriliteral_bare.parquet
- config_name: quadriliteral_augmented
  data_files: data/quadriliteral_augmented.parquet
---

# Arabic Verbs Statistics Tables — جداول إحصاء الأفعال العربية

<div dir="rtl">

**جداول إحصاء الأفعال العربية**: $verbs فعلًا عربيًّا مرتبة على جذورها، في أربعة جداول: الثلاثي المجرد، والثلاثي المزيد، والرباعي المجرد، والرباعي المزيد. لكل فعل وزنه، وحكمه من حيث اللزوم والتعدية: لازم (ل)، أو متعدٍّ (م)، أو مشترك في اللزوم والتعدية (ك)، أي إنه يرد لازمًا في بعض معانيه ومتعديًا في معانيه الأخرى.

إعداد المحتوى: مروان البواب ويحيى مير علم. معالجة البيانات والنشر: ميشيل بكني ووائل تلات. تاريخ النشر: مارس 2025.

</div>

**$verbs Arabic verbs**, organised by root, from four tables: bare triliteral, augmented triliteral, bare quadriliteral and augmented quadriliteral verbs. Each verb comes with its pattern (وزن) and its transitivity: intransitive (لازم), transitive (متعدٍّ), or both (مشترك), for a verb that is intransitive in some of its senses and transitive in others.

Content prepared by Marwan Bawwab and Yahya Mir Alam; data processing and publication by Michel Bakni and Wael Tellat. First published in March 2025. The data is maintained on GitHub at [M-Bakni/arabic-morphology](https://github.com/M-Bakni/arabic-morphology), and every verb can be searched and filtered at <https://m-bakni.github.io/arabic-morphology/>.

## Loading

```python
from datasets import load_dataset

verbs = load_dataset("m-bakni/arabic-morphology", split="train")  # $verbs rows

form_x = verbs.filter(lambda v: v["form"] == "X")  # استفعل
transitive = verbs.filter(lambda v: v["transitivity"] == "transitive")

# One of the four tables as published, one row per root:
tri_bare = load_dataset(
    "m-bakni/arabic-morphology", "triliteral_bare", split="train"
)  # $triliteral_bare_roots rows
```

Or straight from Parquet, with pandas, polars or DuckDB:

```python
import pandas as pd

verbs = pd.read_parquet("hf://datasets/m-bakni/arabic-morphology/data/verbs.parquet")
```

## Data

| Config | Rows | Verbs |
|:---|---:|---:|
| `verbs` (default) | $verbs verbs | $verbs |
| `triliteral_bare` — الأفعال الثلاثية المجردة | $triliteral_bare_roots roots | $triliteral_bare_verbs |
| `triliteral_augmented` — الأفعال الثلاثية المزيدة | $triliteral_augmented_roots roots | $triliteral_augmented_verbs |
| `quadriliteral_bare` — الأفعال الرباعية المجردة | $quadriliteral_bare_roots roots | $quadriliteral_bare_verbs |
| `quadriliteral_augmented` — الأفعال الرباعية المزيدة | $quadriliteral_augmented_roots roots | $quadriliteral_augmented_verbs |

Of the $verbs verbs, $intransitive are intransitive, $transitive transitive and $both both.

### `verbs` (default config, `data/verbs.parquet`)

One row per verb: every non-empty cell of the four tables, with the verb written out in full with its vowels. Rows are sorted by root, and within a root bare verbs come before augmented ones.

| Column | Type | Description |
|:---|:---|:---|
| `verb` | string | The verb in the past tense, third person masculine singular, fully vocalized, e.g. `أَبَّبَ` |
| `root` | string | Root, e.g. `أبب` |
| `root_type` | string | `triliteral` (ثلاثي) or `quadriliteral` (رباعي) |
| `augmentation` | string | `bare` (مجرد) or `augmented` (مزيد) |
| `form` | string | Verb form in the usual Western numbering, e.g. `I`, `X`, `IIq`; see below |
| `pattern` | string | Pattern (وزن), as in the column headers of the tables, e.g. `استفعل`; for bare triliteral verbs, the past and present vowel pattern (باب), e.g. `فعَل يفعُل` |
| `transitivity` | string | `intransitive`, `transitive` or `both` |
| `transitivity_code` | string | The same, as in the tables: `ل`, `م` or `ك` |
| `verb_type` | string | For bare triliteral verbs only, the class of the verb by its root letters, e.g. `صحيح سالم`, `صحيح مضعف`, `معتل أجوف واوي`; null otherwise |

Patterns and forms:

| Root | Augmentation | Patterns (`form`) |
|:---|:---|:---|
| triliteral | bare | `فعَل يفعُل`, `فعَل يفعِل`, `فعَل يفعَل`, `فعِل يفعَل`, `فعُل يفعُل`, `فعِل يفعِل` (all `I`) |
| triliteral | augmented | `فعّل` (`II`), `فاعل` (`III`), `أفعل` (`IV`), `تفعّل` (`V`), `تفاعل` (`VI`), `انفعل` (`VII`), `افتعل` (`VIII`), `افعلّ` (`IX`), `استفعل` (`X`), `افعالّ` (`XI`), `افعوعل` (`XII`), `افعوّل` (`XIII`) |
| quadriliteral | bare | `فَعْلَلَ` (`Iq`) |
| quadriliteral | augmented | `تفعلل` (`IIq`), `افعنلل` (`IIIq`), `افعللّ` (`IVq`) |

### The four tables (configs `triliteral_bare`, `triliteral_augmented`, `quadriliteral_bare`, `quadriliteral_augmented`)

The tables exactly as published in the repository as xlsx, CSV and JSON, with their Arabic headers: one row per root, a column for the root (`الجذر`), one per root letter (`الحرف الأول للجذر`, …), and one per pattern. A cell holds `ل`, `م` or `ك` when the root has a verb on that pattern, and is null otherwise. All columns are strings.

## Source and updates

The canonical data is in [M-Bakni/arabic-morphology](https://github.com/M-Bakni/arabic-morphology): the tables in `data/csv/` (with the same data in `data/xlsx/` and `data/json/`), and the vocalized verbs in `site/verbs.json`. This dataset is regenerated from them automatically whenever they change on `main`; the export checks that the tables and the vocalized verbs agree on every verb. The files here were exported from commit $exported_from on $exported_on.

## Citation

```bibtex
@misc{arabic_verbs_statistics_tables,
  author    = {Bawwab, Marwan and Mir Alam, Yahya and Bakni, Michel and Tellat, Wael},
  title     = {Arabic Verbs Statistics Tables},
  year      = {2025},
  publisher = {GitHub},
  url       = {https://github.com/M-Bakni/arabic-morphology},
  note      = {Dataset: \url{https://huggingface.co/datasets/m-bakni/arabic-morphology}}
}
```

## License

[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Please credit the *Arabic Verbs Statistics Tables* (<https://github.com/M-Bakni/arabic-morphology>) and their authors.
