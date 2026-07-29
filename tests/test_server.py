import os
import tempfile
import unittest

from docx import Document
from fastapi.testclient import TestClient

from server import app


class AnalyzeEndpointTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_get_analyze_returns_helpful_message(self):
        response = self.client.get('/analyze')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'ok')
        self.assertIn('POST', response.json()['message'])

    def test_subscribe_accepts_google_pay_and_phonepe(self):
        response = self.client.post(
            '/subscribe',
            json={
                'plan': 'pro',
                'payment_method': 'google_pay',
                'phone_number': '9876543210',
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'success')
        self.assertEqual(response.json()['payment_method'], 'google_pay')
        self.assertIn('subscription', response.json()['message'].lower())

    def test_analyze_rejects_invalid_mode(self):
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as temp_docx:
            temp_path = temp_docx.name

        try:
            doc = Document()
            doc.add_paragraph('This is a test paragraph.')
            doc.save(temp_path)

            with open(temp_path, 'rb') as f:
                response = self.client.post(
                    '/analyze',
                    files={
                        'file': ('test.docx', f, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
                    },
                    data={'mode': 'invalid_mode'},
                )

            self.assertEqual(response.status_code, 400)
            self.assertIn('Invalid analysis mode', response.json()['detail'])
        finally:
            os.unlink(temp_path)


if __name__ == '__main__':
    unittest.main()
