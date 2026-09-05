from flask import Blueprint, request, jsonify
from services.search_service import SearchService
from middleware.auth_middleware import token_required

search_bp = Blueprint('search', __name__, url_prefix='/api/search')

@search_bp.route('', methods=['GET'])
@token_required
def search():
    query = request.args.get('q', '')
    results = SearchService.global_search(query)
    return jsonify({'success': True, 'data': results}), 200
