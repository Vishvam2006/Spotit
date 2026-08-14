from app.models.schemas import DocumentType
from app.classifier.document_classifier import DocumentClassifier


def test_classify_driving_license():
    classifier = DocumentClassifier()
    ocr_text = """
    UNION OF INDIA
    DRIVING LICENCE
    NAME: ARYAN PATEL
    DOB: 12/04/2005
    LICENCE NO: DL-1420110012345
    VALID TILL: 11/04/2030
    AUTHORISED TO DRIVE: LMV, MCWG
    """
    doc_type, confidence = classifier.classify(ocr_text)
    assert doc_type == DocumentType.DRIVING_LICENSE
    assert confidence >= 0.60


def test_classify_rc():
    classifier = DocumentClassifier()
    ocr_text = """
    INDIAN UNION VEHICLE REGISTRATION CERTIFICATE
    REGN NO: GJ01AB1234
    OWNER NAME: ARYAN PATEL
    CHASSIS NO: MA3EWB21S00123456
    ENGINE NO: K12MN123456
    FITNESS VALID UPTO: 15/05/2032
    """
    doc_type, confidence = classifier.classify(ocr_text)
    assert doc_type == DocumentType.RC
    assert confidence >= 0.60


def test_classify_unknown():
    classifier = DocumentClassifier()
    ocr_text = """
    INVOICE # 10492
    Store Name: Supermarket
    Item 1: Milk - Rs 50
    Total: Rs 50
    Thank you for shopping!
    """
    doc_type, confidence = classifier.classify(ocr_text)
    assert doc_type == DocumentType.UNKNOWN
    assert confidence < 0.50
