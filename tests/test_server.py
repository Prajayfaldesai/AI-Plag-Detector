import unittest

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


if __name__ == '__main__':
    unittest.main()
