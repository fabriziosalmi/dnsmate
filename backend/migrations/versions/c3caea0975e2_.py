"""empty message

Revision ID: c3caea0975e2
Revises: 8e7b7a2c330c, add_multi_server_mode
Create Date: 2025-08-07 19:51:09.094442

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c3caea0975e2'
down_revision = ('8e7b7a2c330c', 'add_multi_server_mode')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
