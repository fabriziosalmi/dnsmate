"""Add multi_server_mode to PowerDNS settings

Revision ID: add_multi_server_mode
Revises: 51dd43e57094
Create Date: 2025-08-07 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_multi_server_mode'
down_revision = '51dd43e57094'
branch_labels = None
depends_on = None


def upgrade():
    # Add multi_server_mode column to powerdns_settings table
    op.add_column('powerdns_settings', sa.Column('multi_server_mode', sa.Boolean(), nullable=True))
    
    # Set default value for existing records
    op.execute("UPDATE powerdns_settings SET multi_server_mode = false WHERE multi_server_mode IS NULL")
    
    # Make the column non-nullable
    op.alter_column('powerdns_settings', 'multi_server_mode', nullable=False)


def downgrade():
    # Remove multi_server_mode column
    op.drop_column('powerdns_settings', 'multi_server_mode')
