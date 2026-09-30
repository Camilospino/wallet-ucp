#!/usr/bin/env python3
"""
Genera un archivo .docx real (Office Open XML) SIN dependencias externas.

Un .docx no es un programa: es un ZIP con XML dentro. Este modulo escribe esa
estructura a mano para controlar titulos, tablas, bloques de codigo con fuente
monoespaciada e imagenes incrustadas.

Pagina A4 (11906 x 16838 twips) con margenes de 2.5 cm -> 9070 twips utiles.
"""
import os
import struct
import zipfile

GRID = 9070  # ancho util de la retícula, en twips


def esc(t):
    return (str(t).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def _runs(text, b=False, i=False, mono=False, color=None, size=None):
    """Convierte texto en runs XML respetando los saltos de linea."""
    rpr = ["<w:rPr>"]
    if mono:
        rpr.append('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>')
    if b:
        rpr.append("<w:b/>")
    if i:
        rpr.append("<w:i/>")
    if color:
        rpr.append(f'<w:color w:val="{color}"/>')
    if size:
        rpr.append(f'<w:sz w:val="{size}"/><w:szCs w:val="{size}"/>')
    rpr.append("</w:rPr>")
    rpr = "".join(rpr)
    if rpr == "<w:rPr></w:rPr>":
        rpr = ""

    out = []
    for n, part in enumerate(str(text).split("\n")):
        if n:
            out.append(f"<w:r>{rpr}<w:br/></w:r>")
        if part:
            out.append(f'<w:r>{rpr}<w:t xml:space="preserve">{esc(part)}</w:t></w:r>')
    return "".join(out)


def para(text="", style=None, b=False, i=False, mono=False, color=None,
         size=None, align=None, space_after=120, space_before=0, shade=None,
         keep=False):
    ppr = ["<w:pPr>"]
    if style:
        ppr.append(f'<w:pStyle w:val="{style}"/>')
    if keep:
        ppr.append("<w:keepNext/>")
    if shade:
        ppr.append(f'<w:shd w:val="clear" w:color="auto" w:fill="{shade}"/>')
    if align:
        ppr.append(f'<w:jc w:val="{align}"/>')
    ppr.append(f'<w:spacing w:after="{space_after}" w:before="{space_before}"/>')
    ppr.append("</w:pPr>")
    return f'<w:p>{"".join(ppr)}{_runs(text, b, i, mono, color, size)}</w:p>'


def heading(text, level=1):
    return para(text, style=f"Heading{level}",
                space_before=280 if level == 1 else 220,
                space_after=120, keep=True)


def code_block(text, size=16):
    """Bloque monoespaciado con fondo gris y barra azul, como una terminal."""
    out = []
    lines = text.split("\n")
    for n, ln in enumerate(lines):
        left = ('<w:pBdr><w:left w:val="single" w:sz="18" w:space="6" w:color="667EEA"/>'
                "</w:pBdr>") if n == 0 else ""
        ppr = ('<w:pPr><w:pStyle w:val="Codigo"/>'
               '<w:shd w:val="clear" w:color="auto" w:fill="F4F5F7"/>'
               f'{left}<w:spacing w:after="0" w:before="0" w:line="240" w:lineRule="auto"/>'
               "</w:pPr>")
        out.append(f'<w:p>{ppr}{_runs(ln, mono=True, size=size)}</w:p>')
    out.append(para("", space_after=100, size=8))
    return "".join(out)


def table(rows, widths=None, header=True, font=18):
    ncols = len(rows[0])
    if widths is None:
        widths = [100 // ncols] * ncols
    widths = [int(w * GRID / 100) for w in widths]
    widths[-1] = GRID - sum(widths[:-1])

    grid = "".join(f'<w:gridCol w:w="{w}"/>' for w in widths)
    borders = ("<w:tblBorders>"
               '<w:top w:val="single" w:sz="4" w:color="C9CED6"/>'
               '<w:left w:val="single" w:sz="4" w:color="C9CED6"/>'
               '<w:bottom w:val="single" w:sz="4" w:color="C9CED6"/>'
               '<w:right w:val="single" w:sz="4" w:color="C9CED6"/>'
               '<w:insideH w:val="single" w:sz="4" w:color="DDE1E7"/>'
               '<w:insideV w:val="single" w:sz="4" w:color="DDE1E7"/>'
               "</w:tblBorders>")

    xml = [f'<w:tbl><w:tblPr><w:tblW w:w="{GRID}" w:type="dxa"/>{borders}'
           '<w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="90" w:type="dxa"/>'
           '<w:bottom w:w="60" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tblCellMar>'
           f"</w:tblPr><w:tblGrid>{grid}</w:tblGrid>"]

    for r, row in enumerate(rows):
        is_head = header and r == 0
        trpr = "<w:trPr><w:tblHeader/></w:trPr>" if is_head else ""
        cells = []
        for c, cell in enumerate(row):
            if is_head:
                shd = '<w:shd w:val="clear" w:color="auto" w:fill="667EEA"/>'
            elif r % 2 == 0:
                shd = '<w:shd w:val="clear" w:color="auto" w:fill="F7F8FA"/>'
            else:
                shd = ""
            tcpr = (f'<w:tcPr><w:tcW w:w="{widths[c]}" w:type="dxa"/>{shd}'
                    '<w:vAlign w:val="center"/></w:tcPr>')
            ppr = '<w:pPr><w:spacing w:after="20" w:before="20"/></w:pPr>'
            body = _runs(cell, b=is_head,
                         color="FFFFFF" if is_head else None, size=font)
            cells.append(f"<w:tc>{tcpr}<w:p>{ppr}{body}</w:p></w:tc>")
        xml.append(f"<w:tr>{trpr}{''.join(cells)}</w:tr>")

    xml.append("</w:tbl>")
    xml.append(para("", space_after=100, size=10))
    return "".join(xml)


class DocxBuilder:
    """Acumula el cuerpo del documento y las imagenes, y escribe el .docx."""

    def __init__(self):
        self.body = []
        self.images = []          # (nombre, ruta, rid)
        self._n = 0
        self._fig = 0             # contador de figuras
        self.figs = {}            # clave -> numero de figura

    # ---------------- figuras numeradas ----------------
    def fig(self, key, path, caption, max_width_in=6.5):
        """Inserta una figura y le asigna el siguiente numero.

        Las capturas de la interfaz de GitHub requieren sesion iniciada, asi que
        pueden no existir todavia. En ese caso se deja un marcador visible en
        lugar de romper el documento, y el numero se reserva para que las
        referencias del texto sigan siendo correctas al regenerarlo.
        """
        self._fig += 1
        num = self._fig
        self.figs[key] = num
        if not os.path.isfile(path):
            self.add(para(f"[Figura {num} pendiente: {caption}]",
                          i=True, color="8A6D1F", align="center",
                          space_before=100, space_after=60, shade="FFF6DA"))
            return num
        self.image(path, max_width_in=max_width_in)
        self.caption(f"Figura {num}. {caption}")
        return num

    def fignum(self, key):
        """Numero de una figura ya registrada, para citarla en el texto."""
        return self.figs[key]

    def pf(self, text, *keys):
        """Parrafo con referencias a figuras resueltas al final.

        Permite citar una figura que todavia no se ha insertado en el
        documento, escribiendo {clave} en el texto. Al guardar, cada marca se
        sustituye por el numero real de la figura, asi que el orden en que se
        insertan las figuras ya no obliga a renumerar el texto a mano.
        """
        for k in keys:
            text = text.replace("{" + k + "}", f"@@FIG:{k}@@")
        self.add(para(text))

    def _resolve_figs(self, xml):
        for k, n in self.figs.items():
            xml = xml.replace(f"@@FIG:{k}@@", str(n))
        return xml

    # ---------------- contenido ----------------
    def add(self, xml):
        self.body.append(xml)

    def h(self, text, level=1):
        self.add(heading(text, level))

    def p(self, text, **kw):
        self.add(para(text, **kw))

    def bullets(self, items, numbered=False):
        nid = 2 if numbered else 1
        for it in items:
            self.add(
                '<w:p><w:pPr><w:pStyle w:val="ListParagraph"/>'
                f'<w:numPr><w:ilvl w:val="0"/><w:numId w:val="{nid}"/></w:numPr>'
                '<w:spacing w:after="60"/></w:pPr>' + _runs(it) + "</w:p>"
            )

    def code(self, text, size=16):
        self.add(code_block(text, size))

    def tbl(self, rows, **kw):
        self.add(table(rows, **kw))

    def pagebreak(self):
        self.add('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')

    def caption(self, text):
        self.add(para(text, i=True, size=17, color="5A6270",
                      align="center", space_after=220, space_before=60))

    # ---------------- imagenes ----------------
    def png_size(self, path):
        with open(path, "rb") as fh:
            head = fh.read(24)
        return struct.unpack(">II", head[16:24])

    def image(self, path, max_width_in=6.5):
        """Registra la imagen, crea su relacion y anade el <w:drawing>."""
        self._n += 1
        w_px, h_px = self.png_size(path)
        cx, cy = int(w_px * 9525), int(h_px * 9525)      # 96 dpi -> EMU
        max_emu = int(max_width_in * 914400)
        if cx > max_emu:
            f = max_emu / cx
            cx, cy = int(cx * f), int(cy * f)

        name = f"image{self._n}.png"
        rid = f"rId{100 + self._n}"
        self.images.append((name, path, rid))

        self.body.append(
            '<w:p><w:pPr><w:jc w:val="center"/>'
            '<w:spacing w:before="100" w:after="60"/></w:pPr><w:r><w:drawing>'
            '<wp:inline distT="0" distB="0" distL="0" distR="0">'
            f'<wp:extent cx="{cx}" cy="{cy}"/>'
            '<wp:effectExtent l="0" t="0" r="0" b="0"/>'
            f'<wp:docPr id="{self._n}" name="{name}"/>'
            '<wp:cNvGraphicFramePr><a:graphicFrameLocks '
            'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
            'noChangeAspect="1"/></wp:cNvGraphicFramePr>'
            '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
            '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            f'<pic:nvPicPr><pic:cNvPr id="{self._n}" name="{name}"/>'
            "<pic:cNvPicPr/></pic:nvPicPr>"
            f'<pic:blipFill><a:blip r:embed="{rid}"/>'
            "<a:stretch><a:fillRect/></a:stretch></pic:blipFill>"
            f'<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm>'
            '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'
            "</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>"
        )

    # ---------------- escritura ----------------
    def save(self, out_path, title="Documento"):
        os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
        document = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
            'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
            'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
            'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            "<w:body>" + "".join(self.body) +
            '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'
            '<w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418" '
            'w:header="708" w:footer="708" w:gutter="0"/>'
            "</w:sectPr></w:body></w:document>"
        )

        rels = [
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/'
            'officeDocument/2006/relationships/styles" Target="styles.xml"/>',
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/'
            'officeDocument/2006/relationships/numbering" Target="numbering.xml"/>',
        ]
        for name, path, rid in self.images:
            rels.append(
                f'<Relationship Id="{rid}" Type="http://schemas.openxmlformats.org/'
                f'officeDocument/2006/relationships/image" Target="media/{name}"/>'
            )

        with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as z:
            document = self._resolve_figs(document)
            z.writestr("[Content_Types].xml", self._content_types())
            z.writestr("_rels/.rels",
                       '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                       '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                       '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
                       '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
                       "</Relationships>")
            z.writestr("docProps/core.xml",
                       '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                       '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
                       'xmlns:dc="http://purl.org/dc/elements/1.1/">'
                       f"<dc:title>{esc(title)}</dc:title>"
                       "<dc:creator>WalletUCP</dc:creator>"
                       "<cp:lastModifiedBy>WalletUCP</cp:lastModifiedBy></cp:coreProperties>")
            z.writestr("word/document.xml", document)
            z.writestr("word/_rels/document.xml.rels",
                       '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                       '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                       + "".join(rels) + "</Relationships>")
            z.writestr("word/styles.xml", self._styles())
            z.writestr("word/numbering.xml", self._numbering())
            for name, path, rid in self.images:
                z.write(path, f"word/media/{name}")
        return out_path

    def _content_types(self):
        return (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="png" ContentType="image/png"/>'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
            '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
            '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>'
            '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
            "</Types>"
        )

    def _styles(self):
        return (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            "<w:docDefaults><w:rPrDefault><w:rPr>"
            '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>'
            '<w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault>'
            '<w:pPrDefault><w:pPr>'
            '<w:spacing w:after="140" w:line="288" w:lineRule="auto"/>'
            "</w:pPr></w:pPrDefault></w:docDefaults>"
            '<w:style w:type="paragraph" w:default="1" w:styleId="Normal">'
            '<w:name w:val="Normal"/><w:qFormat/></w:style>'
            '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/>'
            '<w:basedOn w:val="Normal"/><w:qFormat/>'
            '<w:pPr><w:outlineLvl w:val="0"/><w:keepNext/></w:pPr>'
            '<w:rPr><w:b/><w:color w:val="1F3A93"/><w:sz w:val="34"/><w:szCs w:val="34"/></w:rPr></w:style>'
            '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/>'
            '<w:basedOn w:val="Normal"/><w:qFormat/>'
            '<w:pPr><w:outlineLvl w:val="1"/><w:keepNext/></w:pPr>'
            '<w:rPr><w:b/><w:color w:val="2B4C9B"/><w:sz w:val="27"/><w:szCs w:val="27"/></w:rPr></w:style>'
            '<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/>'
            '<w:basedOn w:val="Normal"/><w:qFormat/>'
            '<w:pPr><w:outlineLvl w:val="2"/><w:keepNext/></w:pPr>'
            '<w:rPr><w:b/><w:color w:val="3F5AA6"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>'
            '<w:style w:type="paragraph" w:styleId="Codigo"><w:name w:val="Codigo"/>'
            '<w:basedOn w:val="Normal"/>'
            '<w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="16"/></w:rPr></w:style>'
            '<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/>'
            '<w:basedOn w:val="Normal"/><w:qFormat/></w:style>'
            "</w:styles>"
        )

    def _numbering(self):
        def lvl(i, fmt, txt, ind):
            return (f'<w:lvl w:ilvl="{i}"><w:start w:val="1"/>'
                    f'<w:numFmt w:val="{fmt}"/><w:lvlText w:val="{txt}"/>'
                    f'<w:lvlJc w:val="left"/>'
                    f'<w:pPr><w:ind w:left="{ind}" w:hanging="360"/></w:pPr></w:lvl>')
        return (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            '<w:abstractNum w:abstractNumId="0">'
            + lvl(0, "bullet", "•", 720) + lvl(1, "bullet", "o", 1440) +
            "</w:abstractNum>"
            '<w:abstractNum w:abstractNumId="1">' + lvl(0, "decimal", "%1.", 720) +
            "</w:abstractNum>"
            '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>'
            '<w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>'
            "</w:numbering>"
        )
