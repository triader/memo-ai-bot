import * as XLSX from 'xlsx';

export const handleBulkImport = (bot, supabase) => async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!msg.document || !msg.document.mime_type.includes('spreadsheet')) {
    await bot.sendMessage(chatId, 'Please send an Excel file (.xlsx or .xls)');
    return;
  }

  try {
    // First, fetch categories
    const { data: categories } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId);

    let message = 'Choose a category for import or create a new one:\n\n';
    if (categories?.length) {
      message += categories.map((cat, i) => `${i + 1}. ${cat.name}`).join('\n');
      message += '\n\n✨ Or type a new category name to create one';
    } else {
      message += 'Type a category name to create your first category';
    }

    // Get file from Telegram
    const file = await bot.getFile(msg.document.file_id);
    const filePath = file.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`;
    
    // Download and process file
    const fileResponse = await fetch(fileUrl);
    const arrayBuffer = await fileResponse.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    
    // Get first worksheet
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    if (!data.length) {
      await bot.sendMessage(chatId, '❌ The Excel file is empty.');
      return;
    }

    // Validate data format
    const isValidFormat = data.every(row => row.word && row.translation);
    if (!isValidFormat) {
      await bot.sendMessage(
        chatId, 
        '❌ Invalid file format. The Excel file should have columns named "word" and "translation".'
      );
      return;
    }

    // Ask for category
    await bot.sendMessage(chatId, message);
    
    // Wait for category selection
    bot.once('message', async (categoryMsg) => {
      try {
        let selectedCategory;
        
        // Check if user selected existing category by number
        if (/^\d+$/.test(categoryMsg.text)) {
          const index = parseInt(categoryMsg.text) - 1;
          selectedCategory = categories?.[index];
        }
        
        if (!selectedCategory) {
          // Create new category
          const { data: newCategory, error: categoryError } = await supabase
            .from('categories')
            .insert([{
              user_id: userId,
              name: categoryMsg.text.trim()
            }])
            .select()
            .single();

          if (categoryError) throw categoryError;
          selectedCategory = newCategory;
        }

        // Prepare words for insertion
        const words = data.map(row => ({
          user_id: userId,
          category_id: selectedCategory.id,
          word: row.word.trim(),
          translation: row.translation.trim(),
          created_at: new Date()
        }));

        // Insert words into database
        const { error } = await supabase
          .from('words')
          .insert(words);

        if (error) throw error;

        await bot.sendMessage(
          chatId, 
          `✅ Successfully imported ${words.length} words to category "${selectedCategory.name}"!`,
          mainKeyboard
        );
      } catch (error) {
        console.error('Category selection error:', error);
        await bot.sendMessage(
          chatId,
          '❌ Failed to process category selection. Please try again.',
          mainKeyboard
        );
      }
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    await bot.sendMessage(
      chatId, 
      '❌ Failed to process the Excel file. Please make sure it\'s properly formatted.'
    );
  }
};