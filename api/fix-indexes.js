// api/fix-indexes.js
const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndexes() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('🔗 Conectado ao MongoDB');
        
        const db = mongoose.connection.db;
        const collection = db.collection('orders');
        
        // Listar índices atuais
        const indexes = await collection.indexes();
        console.log('📋 Índices existentes:', indexes);
        
        // Procurar e remover índice problemático
        const problematicIndex = indexes.find(index => 
            index.key && index.key.orderId !== undefined
        );
        
        if (problematicIndex) {
            console.log('🗑️ Removendo índice problemático:', problematicIndex.name);
            await collection.dropIndex(problematicIndex.name);
            console.log('✅ Índice removido com sucesso!');
        } else {
            console.log('ℹ️ Nenhum índice problemático encontrado');
        }
        
        // Verificar índices finais
        const finalIndexes = await collection.indexes();
        console.log('📋 Índices finais:', finalIndexes);
        
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado do MongoDB');
    }
}

fixIndexes();